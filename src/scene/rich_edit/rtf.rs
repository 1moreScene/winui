//! Bounded RTF reader/writer. Formatting, pictures and OfficeMath remain Rust data.
use super::*;
use std::collections::HashMap;

#[derive(Clone, Debug)]
enum Token {
    Word(String, Option<i32>),
    Text(Vec<u8>),
    Hex(u8),
    Symbol(u8),
    Group(Vec<Token>),
    Binary(Vec<u8>),
}
const MAX_RTF: usize = 24 * 1024 * 1024;
fn lex(bytes: &[u8]) -> Result<Vec<Token>, String> {
    if bytes.len() > MAX_RTF {
        return Err("RTF exceeds 24 MiB".into());
    }
    fn group(
        bytes: &[u8],
        at: &mut usize,
        depth: usize,
        count: &mut usize,
    ) -> Result<Vec<Token>, String> {
        if depth > 128 {
            return Err("RTF nesting exceeds limits".into());
        }
        let mut out = vec![];
        while *at < bytes.len() {
            *count += 1;
            if *count > 300000 {
                return Err("RTF token count exceeds limits".into());
            }
            let b = bytes[*at];
            *at += 1;
            match b {
                b'{' => out.push(Token::Group(group(bytes, at, depth + 1, count)?)),
                b'}' => {
                    if depth == 0 {
                        return Err("unexpected RTF closing brace".into());
                    } else {
                        return Ok(out);
                    }
                }
                b'\\' => {
                    let c = *bytes.get(*at).ok_or("truncated RTF escape")?;
                    *at += 1;
                    if c == b'\'' {
                        let raw = bytes.get(*at..*at + 2).ok_or("truncated RTF hex escape")?;
                        let s = std::str::from_utf8(raw).map_err(|_| "invalid RTF hex escape")?;
                        out.push(Token::Hex(
                            u8::from_str_radix(s, 16).map_err(|_| "invalid RTF hex escape")?,
                        ));
                        *at += 2;
                    } else if c.is_ascii_alphabetic() {
                        let begin = *at - 1;
                        while *at < bytes.len() && bytes[*at].is_ascii_alphabetic() {
                            *at += 1;
                        }
                        let name = std::str::from_utf8(&bytes[begin..*at]).unwrap().to_string();
                        if name.len() > 64 {
                            return Err("RTF control word exceeds limit".into());
                        }
                        let begin = *at;
                        if bytes.get(*at) == Some(&b'-') {
                            *at += 1;
                        }
                        while *at < bytes.len() && bytes[*at].is_ascii_digit() {
                            *at += 1;
                        }
                        let number = if *at > begin {
                            Some(
                                std::str::from_utf8(&bytes[begin..*at])
                                    .unwrap()
                                    .parse::<i32>()
                                    .map_err(|_| "invalid RTF numeric parameter")?,
                            )
                        } else {
                            None
                        };
                        if bytes.get(*at) == Some(&b' ') {
                            *at += 1;
                        }
                        if name == "bin" {
                            let len = usize::try_from(number.ok_or("RTF bin needs length")?)
                                .map_err(|_| "negative RTF binary length")?;
                            let data = bytes
                                .get(*at..at.checked_add(len).ok_or("RTF binary overflow")?)
                                .ok_or("truncated RTF binary payload")?;
                            out.push(Token::Binary(data.to_vec()));
                            *at += len;
                        } else {
                            out.push(Token::Word(name, number));
                        }
                    } else {
                        out.push(Token::Symbol(c));
                    }
                }
                b'\r' | b'\n' => {}
                _ => {
                    let begin = *at - 1;
                    while *at < bytes.len()
                        && !matches!(bytes[*at], b'{' | b'}' | b'\\' | b'\r' | b'\n')
                    {
                        *at += 1;
                    }
                    out.push(Token::Text(bytes[begin..*at].to_vec()));
                }
            }
        }
        if depth > 0 {
            return Err("unclosed RTF group".into());
        }
        Ok(out)
    }
    group(bytes, &mut 0, 0, &mut 0)
}
fn destination(tokens: &[Token]) -> (&str, bool) {
    let mut star = false;
    for t in tokens {
        match t {
            Token::Symbol(b'*') => star = true,
            Token::Word(w, _) => return (w, star),
            Token::Text(t) if t.iter().all(u8::is_ascii_whitespace) => {}
            _ => break,
        }
    }
    ("", star)
}
fn word(tokens: &[Token], key: &str) -> Option<i32> {
    tokens.iter().find_map(|t| match t {
        Token::Word(w, n) if w == key => *n,
        _ => None,
    })
}
fn descendants<'a>(tokens: &'a [Token], key: &str, out: &mut Vec<&'a [Token]>) {
    for t in tokens {
        if let Token::Group(g) = t {
            if destination(g).0 == key {
                out.push(g);
            }
            descendants(g, key, out);
        }
    }
}
fn bytes_text(bytes: &[u8], codepage: i32) -> Result<String, String> {
    let label = match codepage {
        0 | 1252 => "windows-1252",
        65001 => "utf-8",
        936 => "gbk",
        950 => "big5",
        932 => "shift_jis",
        949 => "euc-kr",
        1250 => "windows-1250",
        1251 => "windows-1251",
        1253 => "windows-1253",
        1254 => "windows-1254",
        1255 => "windows-1255",
        1256 => "windows-1256",
        1257 => "windows-1257",
        1258 => "windows-1258",
        874 => "windows-874",
        _ => return Err(format!("unsupported RTF code page: {codepage}")),
    };
    let encoding = encoding_rs::Encoding::for_label(label.as_bytes()).unwrap();
    let (s, errors) = encoding.decode_without_bom_handling(bytes);
    if errors {
        return Err("invalid bytes in RTF character encoding".into());
    }
    Ok(s.into_owned())
}
#[derive(Clone)]
struct State {
    format: CharacterFormat,
    paragraph: ParagraphFormat,
    uc: usize,
    skip: usize,
    codepage: i32,
    pending_high: Option<u16>,
}
impl Default for State {
    fn default() -> Self {
        Self {
            format: Default::default(),
            paragraph: Default::default(),
            uc: 1,
            skip: 0,
            codepage: 1252,
            pending_high: None,
        }
    }
}
struct Reader {
    doc: RichEditDocument,
    fonts: HashMap<i32, String>,
    colors: Vec<Option<String>>,
    lists: HashMap<i32, RichEditListStyle>,
    overrides: HashMap<i32, i32>,
    default_font: Option<String>,
    characters: usize,
}
impl Reader {
    fn push(&mut self, text: &str, s: &State) -> Result<(), String> {
        self.characters += text.len();
        if self.characters > 1_000_000 {
            return Err("RTF text exceeds limits".into());
        }
        if self.doc.paragraphs.is_empty() {
            self.doc.paragraphs.push(s.paragraph.clone());
        }
        for ch in text.chars() {
            if ch == '\n' {
                self.doc.paragraphs.push(s.paragraph.clone());
            }
            let t = ch.to_string();
            if let Some(last) = self
                .doc
                .runs
                .last_mut()
                .filter(|r| r.image.is_none() && r.mathml.is_none() && r.format == s.format)
            {
                last.text.push(ch);
            } else {
                self.doc.runs.push(RichEditRun {
                    text: t,
                    format: s.format.clone(),
                    ..Default::default()
                });
            }
        }
        Ok(())
    }
    fn update_paragraph(&mut self, s: &State) {
        if let Some(last) = self.doc.paragraphs.last_mut() {
            *last = s.paragraph.clone();
        } else {
            self.doc.paragraphs.push(s.paragraph.clone());
        }
    }
    fn character(&mut self, c: char, s: &mut State) -> Result<(), String> {
        if s.skip > 0 {
            s.skip -= 1;
            return Ok(());
        }
        if s.pending_high.is_some() {
            return Err("unpaired RTF UTF-16 surrogate".into());
        }
        self.push(&c.to_string(), s)
    }
    fn unicode(&mut self, number: i32, s: &mut State) -> Result<(), String> {
        if !(-32768..=65535).contains(&number) {
            return Err("RTF Unicode escape exceeds 16 bits".into());
        }
        let u = number as u16;
        if (0xd800..=0xdbff).contains(&u) {
            if s.pending_high.replace(u).is_some() {
                return Err("unpaired RTF high surrogate".into());
            }
        } else if (0xdc00..=0xdfff).contains(&u) {
            let high = s.pending_high.take().ok_or("unpaired RTF low surrogate")?;
            self.push(
                &char::from_u32(0x10000 + ((high as u32 - 0xd800) << 10) + (u as u32 - 0xdc00))
                    .unwrap()
                    .to_string(),
                s,
            )?;
        } else {
            if s.pending_high.is_some() {
                return Err("unpaired RTF high surrogate".into());
            }
            self.push(
                &char::from_u32(u as u32)
                    .ok_or("invalid RTF Unicode")?
                    .to_string(),
                s,
            )?;
        }
        s.skip = s.uc;
        Ok(())
    }
    fn text_only(tokens: &[Token], codepage: i32) -> Result<String, String> {
        let mut reader = Self {
            doc: Default::default(),
            fonts: HashMap::new(),
            colors: vec![],
            lists: HashMap::new(),
            overrides: HashMap::new(),
            default_font: None,
            characters: 0,
        };
        reader.walk(
            tokens,
            &mut State {
                codepage,
                ..Default::default()
            },
            true,
        )?;
        Ok(reader.doc.text())
    }
    fn picture(&mut self, g: &[Token], s: &State) -> Result<(), String> {
        let mime = if g
            .iter()
            .any(|t| matches!(t,Token::Word(w,_)if w=="pngblip"))
        {
            "image/png"
        } else if g
            .iter()
            .any(|t| matches!(t,Token::Word(w,_)if w=="jpegblip"))
        {
            "image/jpeg"
        } else {
            return Err("RTF pictures support PNG and JPEG; metafiles/OLE are unsupported".into());
        };
        let mut raw = vec![];
        let mut hex = vec![];
        for t in g {
            match t {
                Token::Text(b) => {
                    hex.extend(b.iter().copied().filter(|b| !b.is_ascii_whitespace()))
                }
                Token::Binary(b) => raw.extend_from_slice(b),
                Token::Word(w, Some(v)) if w.starts_with("piccrop") && *v != 0 => {
                    return Err("RTF cropped pictures are unsupported".into())
                }
                _ => {}
            }
        }
        if !hex.is_empty() {
            if !raw.is_empty() || hex.len() % 2 != 0 || hex.len() > objects::MAX_IMAGE_BYTES * 2 {
                return Err("invalid RTF picture payload".into());
            }
            for c in hex.chunks(2) {
                raw.push(
                    u8::from_str_radix(
                        std::str::from_utf8(c).map_err(|_| "invalid picture hex")?,
                        16,
                    )
                    .map_err(|_| "invalid picture hex")?,
                );
            }
        }
        let size = match (word(g, "picwgoal"), word(g, "pichgoal")) {
            (Some(w), Some(h)) => Some([w as f64 / 15., h as f64 / 15.]),
            (None, None) => None,
            _ => return Err("RTF picture needs both width and height".into()),
        };
        let mut image = EmbeddedImage::from_bytes(mime, &raw, size)?;
        let mut alt = vec![];
        descendants(g, "winuiAlt", &mut alt);
        if let Some(a) = alt.first() {
            image.alt_text = Self::text_only(&a[1..], s.codepage)?;
        }
        if image.alt_text.is_empty() {
            let mut properties = vec![];
            descendants(g, "sp", &mut properties);
            for prop in properties {
                let key = prop
                    .iter()
                    .filter_map(|t| {
                        if let Token::Group(g) = t {
                            Some(g)
                        } else {
                            None
                        }
                    })
                    .find(|g| destination(g).0 == "sn");
                let value = prop
                    .iter()
                    .filter_map(|t| {
                        if let Token::Group(g) = t {
                            Some(g)
                        } else {
                            None
                        }
                    })
                    .find(|g| destination(g).0 == "sv");
                if let (Some(k), Some(v)) = (key, value) {
                    if Self::text_only(&k[1..], s.codepage)?.trim() == "wzDescription" {
                        image.alt_text = Self::text_only(&v[1..], s.codepage)?;
                    }
                }
            }
        }
        self.doc.runs.push(RichEditRun {
            text: objects::OBJECT.into(),
            image: Some(image),
            format: s.format.clone(),
            ..Default::default()
        });
        Ok(())
    }
    fn walk(&mut self, tokens: &[Token], s: &mut State, metadata: bool) -> Result<(), String> {
        let mut at = 0;
        while at < tokens.len() {
            match &tokens[at] {
                Token::Group(g) => {
                    let (dest, star) = destination(g);
                    match dest {
                        "fonttbl" | "colortbl" | "stylesheet" | "info" | "generator"
                        | "listtable" | "listoverridetable" | "listtext" | "pntext"
                        | "nonshppict" | "themedata" | "colorschememapping" | "datastore"
                        | "xmlnstbl" | "revtbl" | "rsidtbl" => {}
                        "object" | "shp" | "field" | "footnote" | "annotation" => {
                            return Err(format!("unsupported RTF content destination: {dest}"))
                        }
                        "pict" => self.picture(g, s)?,
                        "mmath" | "moMath" | "moMathPara" => {
                            let mut formats = Vec::new();
                            fn leading(g: &[Token], out: &mut Vec<Token>) {
                                for t in g {
                                    match t {
                                        Token::Word(w, _)
                                            if ["f", "fs", "cf", "b", "i", "ul", "strike"]
                                                .contains(&w.as_str()) =>
                                        {
                                            out.push(t.clone())
                                        }
                                        Token::Group(c)
                                            if matches!(
                                                destination(c).0,
                                                "moMath" | "moMathPara"
                                            ) =>
                                        {
                                            leading(c, out)
                                        }
                                        _ => {}
                                    }
                                }
                            }
                            leading(g, &mut formats);
                            let mut math_state = s.clone();
                            self.walk(&formats, &mut math_state, false)?;

                            let mut saved = vec![];
                            descendants(g, "winuiMathML", &mut saved);
                            let xml = if let Some(xml) = saved.first() {
                                Self::text_only(&xml[2..], s.codepage)?
                            } else {
                                format!(
                                    "<math xmlns=\"http://www.w3.org/1998/Math/MathML\">{}</math>",
                                    math_group(g, s.codepage)?
                                )
                            };
                            math::parse(&xml)?;
                            self.doc.runs.push(RichEditRun {
                                text: objects::OBJECT.into(),
                                mathml: Some(xml),
                                format: math_state.format,
                                ..Default::default()
                            });
                        }
                        "pn" => {
                            s.paragraph.list_style = if g
                                .iter()
                                .any(|t| matches!(t,Token::Word(w,_)if w=="pnlvlblt"))
                            {
                                RichEditListStyle::Bullet
                            } else if g.iter().any(|t| matches!(t,Token::Word(w,_)if w=="pnucrm")) {
                                RichEditListStyle::UpperRoman
                            } else {
                                RichEditListStyle::Decimal
                            };
                            self.update_paragraph(s);
                        }
                        "upr" => {
                            let unicode = g
                                .iter()
                                .filter_map(|t| {
                                    if let Token::Group(v) = t {
                                        Some(v)
                                    } else {
                                        None
                                    }
                                })
                                .find(|v| destination(v).0 == "ud")
                                .ok_or("RTF upr has no Unicode destination")?;
                            let mut sub = s.clone();
                            self.walk(&unicode[2..], &mut sub, metadata)?;
                        }
                        _ if star && !metadata => {}
                        _ => {
                            let mut sub = s.clone();
                            self.walk(g, &mut sub, metadata)?;
                            if sub.pending_high.is_some() {
                                return Err("unpaired Unicode at RTF group boundary".into());
                            }
                        }
                    }
                }
                Token::Text(b) => {
                    let mut bytes = b.clone();
                    while at + 1 < tokens.len() {
                        match &tokens[at + 1] {
                            Token::Hex(b) => bytes.push(*b),
                            Token::Text(b) => bytes.extend_from_slice(b),
                            _ => break,
                        }
                        at += 1;
                    }
                    let skip = s.skip.min(bytes.len());
                    s.skip -= skip;
                    bytes.drain(..skip);
                    for c in bytes_text(&bytes, s.codepage)?.chars() {
                        self.character(c, s)?;
                    }
                }
                Token::Hex(b) => {
                    let mut bytes = vec![*b];
                    while let Some(Token::Hex(b)) = tokens.get(at + 1) {
                        bytes.push(*b);
                        at += 1;
                    }
                    let skip = s.skip.min(bytes.len());
                    s.skip -= skip;
                    bytes.drain(..skip);
                    for c in bytes_text(&bytes, s.codepage)?.chars() {
                        self.character(c, s)?;
                    }
                }
                Token::Symbol(b) => match b {
                    b'\\' | b'{' | b'}' => self.character(*b as char, s)?,
                    b'~' => self.character('\u{a0}', s)?,
                    b'_' => self.character('\u{2011}', s)?,
                    b'-' => self.character('\u{ad}', s)?,
                    b'*' | b'\r' | b'\n' => {}
                    _ => return Err("unsupported RTF control symbol".into()),
                },
                Token::Binary(_) => return Err("RTF binary data outside picture".into()),
                Token::Word(w, n) => {
                    if metadata
                        && ![
                            "u",
                            "uc",
                            "ansicpg",
                            "par",
                            "line",
                            "tab",
                            "emdash",
                            "endash",
                            "lquote",
                            "rquote",
                            "ldblquote",
                            "rdblquote",
                        ]
                        .contains(&w.as_str())
                    {
                        at += 1;
                        continue;
                    }
                    let on = n.unwrap_or(1) != 0;
                    match w.as_str() {
                        "rtf" if *n != Some(1) => return Err("unsupported RTF version".into()),
                        "rtf" | "ansi" => {}
                        "ansicpg" => {
                            s.codepage = n.ok_or("RTF ansicpg needs a value")?;
                            bytes_text(&[], s.codepage)?;
                        }
                        "uc" => {
                            s.uc = usize::try_from(n.unwrap_or(1)).map_err(|_| "invalid RTF uc")?;
                            if s.uc > 16 {
                                return Err("RTF Unicode fallback exceeds limit".into());
                            }
                        }
                        "u" => self.unicode(n.ok_or("RTF u needs a value")?, s)?,
                        "b" => s.format.bold = Some(on),
                        "i" => s.format.italic = Some(on),
                        "ul" => s.format.underline = Some(on),
                        "ulnone" => s.format.underline = Some(false),
                        "strike" => s.format.strikethrough = Some(on),
                        "f" => {
                            s.format.font_family = Some(
                                self.fonts
                                    .get(&n.unwrap_or(0))
                                    .ok_or("undefined RTF font")?
                                    .clone(),
                            )
                        }
                        "fs" => {
                            let size = n.ok_or("RTF fs needs a value")? as f64 * 2. / 3.;
                            s.format.font_size = Some(size);
                            s.format.validate()?;
                        }
                        "cf" => {
                            let index = usize::try_from(n.unwrap_or(0))
                                .map_err(|_| "negative RTF color")?;
                            s.format.foreground =
                                self.colors.get(index).ok_or("undefined RTF color")?.clone();
                        }
                        "plain" => {
                            s.format = CharacterFormat {
                                font_family: self.default_font.clone(),
                                ..Default::default()
                            }
                        }
                        "pard" => {
                            s.paragraph = ParagraphFormat::default();
                            self.update_paragraph(s);
                        }
                        "ql" | "qc" | "qr" => {
                            s.paragraph.alignment = match w.as_str() {
                                "qc" => RichEditAlignment::Center,
                                "qr" => RichEditAlignment::Right,
                                _ => RichEditAlignment::Left,
                            };
                            self.update_paragraph(s);
                        }
                        "par" | "line" => {
                            s.skip = 0;
                            self.push("\n", s)?;
                        }
                        "tab" => self.character('\t', s)?,
                        "emdash" => self.character('—', s)?,
                        "endash" => self.character('–', s)?,
                        "bullet" => self.character('•', s)?,
                        "lquote" => self.character('‘', s)?,
                        "rquote" => self.character('’', s)?,
                        "ldblquote" => self.character('“', s)?,
                        "rdblquote" => self.character('”', s)?,
                        "emspace" => self.character('\u{2003}', s)?,
                        "enspace" => self.character('\u{2002}', s)?,
                        "ls" => {
                            let list = n.ok_or("RTF ls needs a value")?;
                            let id = self.overrides.get(&list).copied().unwrap_or(list);
                            s.paragraph.list_style =
                                *self.lists.get(&id).ok_or("undefined RTF list")?;
                            self.update_paragraph(s);
                        }
                        "tx" if n.unwrap_or(720) == 720 => {}
                        "ilvl" if n.unwrap_or(0) != 0 => {
                            return Err("nested RTF lists are unsupported".into())
                        }
                        "li" | "ri" | "fi"
                            if n.unwrap_or(0) != 0
                                && s.paragraph.list_style == RichEditListStyle::None =>
                        {
                            return Err("custom RTF paragraph indent is unsupported".into())
                        }
                        "highlight" | "cb" if n.unwrap_or(0) != 0 => {
                            return Err("RTF character background is unsupported".into())
                        }
                        "v" if on => return Err("RTF hidden content is unsupported".into()),
                        "super" | "sub" | "trowd" | "intbl" | "cell" | "row" | "qj" | "uldb" => {
                            return Err(format!("unsupported RTF formatting: {w}"))
                        }
                        "deff" | "deflang" | "deflangfe" | "lang" | "langfe" | "viewkind"
                        | "viewscale" | "fet" | "fbidis" | "nouicompat" | "deftab"
                        | "widowctrl" | "widctlpar" | "noproof" | "ltrch" | "ltrpar" | "loch"
                        | "hich" | "dbch" | "langnp" | "langfenp" | "ilvl" | "li" | "ri" | "fi"
                        | "highlight" | "cb" | "v" | "nosupersub" | "sectd" | "paperw"
                        | "paperh" | "margl" | "margr" | "margt" | "margb" | "cocoartf"
                        | "cocoatextscaling" | "cocoaplatform" => {}
                        _ if metadata => {}
                        _ => return Err(format!("unsupported RTF control word: {w}")),
                    }
                }
            }
            at += 1;
        }
        Ok(())
    }
}
pub fn decode(input: &str) -> Result<RichEditDocument, String> {
    decode_bytes(input.as_bytes())
}
pub fn decode_bytes(input: &[u8]) -> Result<RichEditDocument, String> {
    let input = input.strip_suffix(&[0]).unwrap_or(input);
    let tokens = lex(input)?;
    let mut roots = tokens
        .iter()
        .filter(|t| !matches!(t,Token::Text(t)if t.iter().all(u8::is_ascii_whitespace)));
    let root = match roots.next() {
        Some(Token::Group(g)) if destination(g).0 == "rtf" => g,
        _ => return Err("input is not an RTF document".into()),
    };
    if roots.next().is_some() {
        return Err("trailing content after RTF document".into());
    }
    let codepage = word(root, "ansicpg").unwrap_or(1252);
    bytes_text(&[], codepage)?;
    let mut r = Reader {
        doc: Default::default(),
        fonts: HashMap::new(),
        colors: vec![None],
        lists: HashMap::new(),
        overrides: HashMap::new(),
        default_font: None,
        characters: 0,
    };
    let mut font_tables = vec![];
    descendants(root, "fonttbl", &mut font_tables);
    for table in font_tables {
        for t in table {
            if let Token::Group(font) = t {
                if let Some(id) = word(font, "f") {
                    let family = Reader::text_only(font, codepage)?
                        .trim_end_matches(';')
                        .trim()
                        .to_string();
                    if family.is_empty() {
                        return Err("empty RTF font name".into());
                    }
                    r.fonts.insert(id, family);
                }
            }
        }
    }
    // Font names contain control words but must not be decoded through the body font lookup.
    r.default_font = word(root, "deff").and_then(|id| r.fonts.get(&id).cloned());
    let mut colors = vec![];
    descendants(root, "colortbl", &mut colors);
    if let Some(table) = colors.first() {
        r.colors.clear();
        let mut rgb = [0i32; 3];
        let mut present = false;
        for t in *table {
            match t {
                Token::Word(w, Some(v)) if ["red", "green", "blue"].contains(&w.as_str()) => {
                    if !(0..=255).contains(v) {
                        return Err("invalid RTF color component".into());
                    }
                    rgb[match w.as_str() {
                        "red" => 0,
                        "green" => 1,
                        _ => 2,
                    }] = *v;
                    present = true;
                }
                Token::Text(b) => {
                    for v in b {
                        if *v == b';' {
                            r.colors.push(
                                present.then(|| {
                                    format!("#{:02x}{:02x}{:02x}", rgb[0], rgb[1], rgb[2])
                                }),
                            );
                            rgb = [0; 3];
                            present = false;
                        } else if !v.is_ascii_whitespace() {
                            return Err("invalid RTF color table".into());
                        }
                    }
                }
                _ => {}
            }
        }
    }
    let mut lists = vec![];
    descendants(root, "list", &mut lists);
    for list in lists {
        if let Some(id) = word(list, "listid") {
            let mut levels = vec![];
            descendants(list, "listlevel", &mut levels);
            let nfc = levels
                .first()
                .and_then(|g| word(g, "levelnfc"))
                .unwrap_or(0);
            let style = match nfc {
                0 => RichEditListStyle::Decimal,
                1 => RichEditListStyle::UpperRoman,
                23 => RichEditListStyle::Bullet,
                _ => return Err("unsupported RTF list numbering".into()),
            };
            r.lists.insert(id, style);
        }
    }
    let mut overrides = vec![];
    descendants(root, "listoverride", &mut overrides);
    for g in overrides {
        if let (Some(ls), Some(id)) = (word(g, "ls"), word(g, "listid")) {
            r.overrides.insert(ls, id);
        }
    }
    let mut state = State {
        codepage,
        format: CharacterFormat {
            font_family: r.default_font.clone(),
            ..Default::default()
        },
        ..Default::default()
    };
    r.walk(root, &mut state, false)?;
    if state.pending_high.is_some() {
        return Err("unpaired RTF surrogate at document end".into());
    }
    // RTF terminates the final paragraph; the SDK schema has no implicit TOM mark.
    if r.doc.runs.last().is_some_and(|r| r.text.ends_with('\n')) {
        r.doc.runs.last_mut().unwrap().text.pop();
        r.doc.paragraphs.pop();
        r.doc.compact();
    }
    r.doc.validate()?;
    Ok(r.doc)
}

fn escaped(s: &str) -> String {
    let mut out = String::new();
    for c in s.chars() {
        match c {
            '\\' | '{' | '}' => {
                out.push('\\');
                out.push(c);
            }
            '\n' => out.push_str("\\line "),
            '\t' => out.push_str("\\tab "),
            c if c.is_ascii() && !c.is_control() => out.push(c),
            c => {
                for u in c.encode_utf16(&mut [0; 2]) {
                    out.push_str(&format!("\\u{}?", *u as i16));
                }
            }
        }
    }
    out
}
pub fn encode(doc: &RichEditDocument, p: &NodeProperties) -> Result<String, String> {
    doc.validate()?;
    let mut fonts = vec![p.font_family.clone()];
    let mut colors: Vec<String> = vec![];
    for run in &doc.runs {
        if let Some(f) = &run.format.font_family {
            if !fonts.contains(f) {
                fonts.push(f.clone());
            }
        }
        if let Some(c) = &run.format.foreground {
            if c.len() == 9 && !c.ends_with("ff") {
                return Err("RTF cannot represent transparent text color".into());
            }
            let color = c[..7].to_lowercase();
            if !colors.contains(&color) {
                colors.push(color);
            }
        }
    }
    let math_font = if doc.runs.iter().any(|r| r.mathml.is_some()) {
        if !fonts.iter().any(|f| f == "Cambria Math") {
            fonts.push("Cambria Math".into());
        }
        fonts.iter().position(|f| f == "Cambria Math")
    } else {
        None
    };
    let mut out = String::from("{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1{\\fonttbl");
    for (i, f) in fonts.iter().enumerate() {
        out.push_str(&format!("{{\\f{i}\\fnil {} ;}}", escaped(f)));
    }
    out.push_str("}{\\colortbl ;");
    for c in &colors {
        let rgb = crate::material::rgba(c);
        out.push_str(&format!(
            "\\red{}\\green{}\\blue{};",
            (rgb[0] * 255.).round() as u8,
            (rgb[1] * 255.).round() as u8,
            (rgb[2] * 255.).round() as u8
        ));
    }
    out.push('}');
    if let Some(font) = math_font {
        out.push_str(&format!("{{\\*\\mmathPr\\mmathFont{font}}}"));
    }
    let mut paragraph = 0;
    let mut fresh = true;
    for run in &doc.runs {
        let f = run.format.font(p);
        let font = fonts.iter().position(|v| *v == f.family).unwrap_or(0);
        let cf = run
            .format
            .foreground
            .as_ref()
            .and_then(|c| colors.iter().position(|v| *v == c[..7].to_lowercase()))
            .map_or(0, |i| i + 1);
        let style = format!(
            "\\plain\\f{font}\\fs{}\\b{}\\i{}\\ul{}\\strike{}\\cf{cf} ",
            (f.size * 1.5).round() as u32,
            u8::from(f.weight >= 600),
            u8::from(f.style != FontStyle::Normal),
            u8::from(run.format.underline == Some(true)),
            u8::from(run.format.strikethrough == Some(true))
        );
        let header = |out: &mut String, pi: usize| {
            let q = doc.paragraphs.get(pi).cloned().unwrap_or_default();
            out.push_str("\\pard");
            out.push_str(match q.alignment {
                RichEditAlignment::Left => "\\ql ",
                RichEditAlignment::Center => "\\qc ",
                RichEditAlignment::Right => "\\qr ",
            });
            match q.list_style {
                RichEditListStyle::None => {}
                RichEditListStyle::Bullet => out.push_str("{\\*\\pn\\pnlvlblt{\\pntxtb\\u8226?}}"),
                RichEditListStyle::Decimal => {
                    out.push_str("{\\*\\pn\\pnlvlbody\\pndec\\pnstart1{\\pntxta.}}")
                }
                RichEditListStyle::UpperRoman => {
                    out.push_str("{\\*\\pn\\pnlvlbody\\pnucrm\\pnstart1{\\pntxta.}}")
                }
            }
        };
        if fresh {
            header(&mut out, paragraph);
            fresh = false;
        }
        if let Some(image) = &run.image {
            let (mime, data) = image.bytes()?;
            let natural = objects::image_size(mime, &data)?;
            out.push_str(&format!("{{{style}{{\\pict\\{}\\picw{}\\pich{}\\picwgoal{}\\pichgoal{}{{\\*\\winuiAlt {}}}\n",if mime=="image/png"{"pngblip"}else{"jpegblip"},natural[0] as u32,natural[1] as u32,(image.width*15.).round() as u32,(image.height*15.).round() as u32,escaped(&image.alt_text)));
            for b in data {
                out.push_str(&format!("{b:02x}"));
            }
            out.push_str("}}");
        } else if let Some(xml) = &run.mathml {
            let node = math::parse(xml)?;
            out.push('{');
            out.push_str(&style);
            out.push_str("{\\mmath{\\*\\moMathPara{\\*\\moMath");
            out.push_str(&format!("\\f{} ", math_font.unwrap()));
            out.push_str("{\\*\\winuiMathML ");
            out.push_str(&escaped(xml));
            out.push('}');
            out.push_str(&math_rtf(&node)?);
            out.push_str("}}}}");
        } else {
            for (i, part) in run.text.split('\n').enumerate() {
                if i > 0 {
                    out.push_str("\\par\n");
                    paragraph += 1;
                    header(&mut out, paragraph);
                }
                if !part.is_empty() {
                    out.push('{');
                    out.push_str(&style);
                    out.push_str(&escaped(part));
                    out.push('}');
                }
            }
        }
    }
    out.push_str("\\par}");
    if out.len() > MAX_RTF {
        return Err("encoded RTF exceeds limits".into());
    }
    Ok(out)
}
fn math_rtf(n: &math::MathNode) -> Result<String, String> {
    let children = n
        .children
        .iter()
        .map(math_rtf)
        .collect::<Result<Vec<_>, _>>()?;
    let arg = |name: &str, i: usize| {
        format!(
            "{{\\{name} {}}}",
            children.get(i).cloned().unwrap_or_default()
        )
    };
    let object =
        |name: &str, args: String| format!("{{\\{name}{{\\{name}Pr{{\\mctrlPr}}}}{args}}}");
    Ok(match n.name.as_str() {
        "math" | "mrow" | "mstyle" | "mtd" => children.join(""),
        "mi" | "mn" | "mo" | "mtext" | "ms" => format!(
            "{{\\mr\\i{} {}}}",
            u8::from(
                n.name == "mi"
                    && n.text.chars().count() == 1
                    && n.attributes
                        .get("mathvariant")
                        .is_none_or(|v| v != "normal")
            ),
            escaped(&n.text)
        ),
        "mfrac" => object("mf", format!("{}{}", arg("mnum", 0), arg("mden", 1))),
        "msqrt" => format!(
            "{{\\mrad{{\\mradPr{{\\mctrlPr}}{{\\mdegHide on}}}}{{\\mdeg }}{{\\me {}}}}}",
            children.join("")
        ),
        "mroot" => object("mrad", format!("{}{}", arg("mdeg", 1), arg("me", 0))),
        "msub" => object("msSub", format!("{}{}", arg("me", 0), arg("msub", 1))),
        "msup" => object("msSup", format!("{}{}", arg("me", 0), arg("msup", 1))),
        "msubsup" => object(
            "msSubSup",
            format!("{}{}{}", arg("me", 0), arg("msub", 1), arg("msup", 2)),
        ),
        "munder" => object("mlimLow", format!("{}{}", arg("me", 0), arg("mlim", 1))),
        "mover" => object("mlimUpp", format!("{}{}", arg("me", 0), arg("mlim", 1))),
        "munderover" => object(
            "mlimUpp",
            format!(
                "{{\\me {}}}{}",
                object("mlimLow", format!("{}{}", arg("me", 0), arg("mlim", 1))),
                arg("mlim", 2)
            ),
        ),
        "mfenced" => {
            let open = n.attributes.get("open").map(String::as_str).unwrap_or("(");
            let close = n.attributes.get("close").map(String::as_str).unwrap_or(")");
            format!(
                "{{\\md{{\\mdPr{{\\mctrlPr}}{{\\mbegChr {}}}{{\\mendChr {}}}}}{} }}",
                escaped(open),
                escaped(close),
                children
                    .iter()
                    .map(|c| format!("{{\\me {c}}}"))
                    .collect::<String>()
            )
        }
        "mtable" => object("mm", children.join("")),
        "mtr" => format!(
            "{{\\mmr {}}}",
            children
                .iter()
                .map(|c| format!("{{\\me {c}}}"))
                .collect::<String>()
        ),
        "semantics" => children.first().cloned().unwrap_or_default(),
        "annotation" | "annotation-xml" => String::new(),
        _ => {
            return Err(format!(
                "MathML {} cannot be exported to OfficeMath RTF; use MathML export",
                n.name
            ))
        }
    })
}
fn math_group(g: &[Token], codepage: i32) -> Result<String, String> {
    let name = destination(g).0;
    let sub = g
        .iter()
        .filter_map(|t| {
            if let Token::Group(v) = t {
                Some(v.as_slice())
            } else {
                None
            }
        })
        .filter(|v| {
            let d = destination(v).0;
            !d.ends_with("Pr") && !d.starts_with("winui")
        })
        .collect::<Vec<_>>();
    let argument = |key: &str| -> Result<String, String> {
        let a = sub
            .iter()
            .find(|v| destination(v).0 == key)
            .ok_or_else(|| format!("OfficeMath RTF missing {key}"))?;
        math_group(a, codepage)
    };
    let wrap = |tag: &str, inside: String| format!("<{tag}>{inside}</{tag}>");
    Ok(match name {
        "mf" => wrap(
            "mfrac",
            format!("{}{}", argument("mnum")?, argument("mden")?),
        ),
        "mrad" => {
            let base = argument("me")?;
            let degree = argument("mdeg")?;
            if !roxmltree::Document::parse(&format!("<math>{degree}</math>"))
                .map(|d| {
                    d.descendants()
                        .any(|n| n.is_text() && !n.text().unwrap_or("").trim().is_empty())
                })
                .unwrap_or(true)
            {
                wrap("msqrt", base)
            } else {
                wrap("mroot", format!("{base}{degree}"))
            }
        }
        "msSub" => wrap("msub", format!("{}{}", argument("me")?, argument("msub")?)),
        "msSup" => wrap("msup", format!("{}{}", argument("me")?, argument("msup")?)),
        "msSubSup" => wrap(
            "msubsup",
            format!(
                "{}{}{}",
                argument("me")?,
                argument("msub")?,
                argument("msup")?
            ),
        ),
        "mlimLow" => wrap(
            "munder",
            format!("{}{}", argument("me")?, argument("mlim")?),
        ),
        "mlimUpp" => wrap("mover", format!("{}{}", argument("me")?, argument("mlim")?)),
        "mm" => wrap(
            "mtable",
            sub.iter()
                .map(|g| math_group(g, codepage))
                .collect::<Result<Vec<_>, _>>()?
                .join(""),
        ),
        "mmr" => wrap(
            "mtr",
            sub.iter()
                .map(|g| math_group(g, codepage).map(|v| wrap("mtd", v)))
                .collect::<Result<Vec<_>, _>>()?
                .join(""),
        ),
        "md" => wrap(
            "mfenced",
            sub.iter()
                .map(|g| math_group(g, codepage))
                .collect::<Result<Vec<_>, _>>()?
                .join(""),
        ),
        "mmath" | "moMath" | "moMathPara" | "me" | "mnum" | "mden" | "msub" | "msup" | "mdeg"
        | "mlim" => {
            let mut body = String::new();
            let mut plain = vec![];
            for t in &g[1..] {
                if let Token::Group(child) = t {
                    if !plain.is_empty() {
                        body.push_str(&wrap(
                            "mi",
                            math::escape(&Reader::text_only(&plain, codepage)?),
                        ));
                        plain.clear();
                    }
                    let d = destination(child).0;
                    if !d.ends_with("Pr") && !d.starts_with("winui") {
                        body.push_str(&math_group(child, codepage)?);
                    }
                } else {
                    plain.push(t.clone());
                }
            }
            if !plain.is_empty() {
                body.push_str(&wrap(
                    "mi",
                    math::escape(&Reader::text_only(&plain, codepage)?),
                ));
            }
            wrap("mrow", body)
        }
        "mr" => wrap("mi", math::escape(&Reader::text_only(&g[1..], codepage)?)),
        _ => return Err(format!("unsupported OfficeMath RTF object: {name}")),
    })
}
