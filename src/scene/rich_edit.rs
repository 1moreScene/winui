//! Rust-owned RichEditBox document. Offsets use UTF-16, like the native TOM.
use super::*;
use crate::typography::Font;
use unicode_segmentation::UnicodeSegmentation;
pub mod math;
pub mod objects;
pub mod rtf;
pub use objects::EmbeddedImage;

pub fn contract() -> &'static serde_json::Value {
    static VALUE: std::sync::OnceLock<serde_json::Value> = std::sync::OnceLock::new();
    VALUE.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/rich-edit-template.json"))
            .expect("pinned RichEditBox template")
    })
}
pub(super) fn native_defaults() -> text_edit::Defaults {
    let scalars = &contract()["scalars"];
    let number = |key: &str| scalars[key].as_str().unwrap().parse::<f64>().unwrap();
    let padding: Vec<f64> = scalars["TextControlThemePadding"]
        .as_str()
        .unwrap()
        .split(',')
        .map(|v| v.parse().unwrap())
        .collect();
    text_edit::Defaults {
        padding: padding.try_into().unwrap(),
        min_width: number("TextControlThemeMinWidth"),
        min_height: number("TextControlThemeMinHeight"),
        radius: scalars["ControlCornerRadius"]
            .as_str()
            .unwrap()
            .split(',')
            .next()
            .unwrap()
            .parse()
            .unwrap(),
    }
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct CharacterFormat {
    pub bold: Option<bool>,
    pub italic: Option<bool>,
    pub underline: Option<bool>,
    pub strikethrough: Option<bool>,
    pub font_size: Option<f64>,
    pub font_family: Option<String>,
    pub foreground: Option<String>,
}
impl CharacterFormat {
    pub fn validate(&self) -> Result<(), String> {
        if self
            .font_size
            .is_some_and(|v| !v.is_finite() || !(1. ..=512.).contains(&v))
        {
            return Err("RichEditBox fontSize must be between 1 and 512".into());
        }
        if self
            .font_family
            .as_ref()
            .is_some_and(|s| s.is_empty() || s.len() > 2048)
        {
            return Err("invalid RichEditBox fontFamily".into());
        }
        if let Some(color) = &self.foreground {
            BrushValue::Color(color.clone()).validate()?;
        }
        Ok(())
    }
    pub fn apply(&mut self, other: &Self) {
        macro_rules! field { ($($f:ident),*) => {$(if other.$f.is_some() {self.$f = other.$f.clone();})*}; }
        field!(
            bold,
            italic,
            underline,
            strikethrough,
            font_size,
            font_family,
            foreground
        );
    }
    pub fn font(&self, p: &NodeProperties) -> Font {
        Font {
            family: self
                .font_family
                .clone()
                .unwrap_or_else(|| p.font_family.clone()),
            size: self.font_size.unwrap_or(p.font_size),
            weight: self
                .bold
                .map_or(p.font_weight, |b| if b { 700 } else { 400 }),
            style: self.italic.map_or(p.font_style, |b| {
                if b {
                    FontStyle::Italic
                } else {
                    FontStyle::Normal
                }
            }),
        }
    }
}
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct ParagraphFormat {
    pub alignment: RichEditAlignment,
    pub list_style: RichEditListStyle,
}
#[derive(Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(Default)]
pub struct ParagraphFormatPatch {
    pub alignment: Option<RichEditAlignment>,
    pub list_style: Option<RichEditListStyle>,
}
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct RichEditRun {
    pub text: String,
    pub format: CharacterFormat,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<EmbeddedImage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mathml: Option<String>,
}
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct RichEditDocument {
    pub runs: Vec<RichEditRun>,
    pub paragraphs: Vec<ParagraphFormat>,
}
impl RichEditDocument {
    pub fn plain_text(&self) -> String {
        self.runs
            .iter()
            .map(|r| {
                if let Some(i) = &r.image {
                    if i.alt_text.is_empty() {
                        "[Image]".into()
                    } else {
                        format!("[{}]", i.alt_text)
                    }
                } else if let Some(xml) = &r.mathml {
                    math::parse(xml)
                        .map(|n| math::plain_text(&n))
                        .unwrap_or_default()
                } else {
                    r.text.clone()
                }
            })
            .collect()
    }
    pub fn selection(&self, start: usize, length: usize) -> Self {
        let text = self.text();
        let end = text_edit::boundary(
            &text,
            start.saturating_add(length).min(text_edit::units(&text)),
        );
        let start = text_edit::boundary(&text, start.min(end));
        let first = text[..text_edit::byte_at(&text, start)]
            .matches('\n')
            .count();
        let count = text[text_edit::byte_at(&text, start)..text_edit::byte_at(&text, end)]
            .matches('\n')
            .count()
            + 1;
        Self {
            runs: self.slice(start, end),
            paragraphs: (first..first + count)
                .map(|i| self.paragraphs.get(i).cloned().unwrap_or_default())
                .collect(),
        }
    }
    pub fn plain(text: String) -> Self {
        Self {
            runs: vec![RichEditRun {
                text,
                ..Default::default()
            }],
            paragraphs: vec![],
        }
    }
    pub fn text(&self) -> String {
        self.runs.iter().map(|r| r.text.as_str()).collect()
    }
    pub fn validate(&self) -> Result<(), String> {
        if self.runs.len() > 10000
            || self.paragraphs.len() > 10000
            || self.runs.iter().map(|r| r.text.len()).sum::<usize>() > 1_000_000
        {
            return Err("RichEditBox document exceeds limits".into());
        }
        if self
            .runs
            .iter()
            .map(|r| {
                r.image.as_ref().map_or(0, |i| i.source.len())
                    + r.mathml.as_ref().map_or(0, String::len)
            })
            .sum::<usize>()
            > 24 * 1024 * 1024
        {
            return Err("embedded document payload exceeds 24 MiB".into());
        }
        for r in &self.runs {
            r.format.validate()?;
            if r.image.is_some() && r.mathml.is_some() {
                return Err("a rich run cannot contain both image and MathML".into());
            }
            if r.image.is_some() || r.mathml.is_some() {
                if r.text != objects::OBJECT {
                    return Err("embedded object run text must be U+FFFC".into());
                }
            }
            if let Some(image) = &r.image {
                image.validate()?;
            }
            if let Some(xml) = &r.mathml {
                math::parse(xml)?;
            }
            if r.text.contains('\r') {
                return Err("RichEditBox document uses LF paragraph separators".into());
            }
        }
        Ok(())
    }
    pub fn format_at(&self, at: usize) -> CharacterFormat {
        let mut offset = 0;
        for run in &self.runs {
            offset += text_edit::units(&run.text);
            if at < offset {
                return run.format.clone();
            }
        }
        self.runs
            .last()
            .map(|r| r.format.clone())
            .unwrap_or_default()
    }
    fn slice(&self, start: usize, end: usize) -> Vec<RichEditRun> {
        let mut result = vec![];
        let mut offset = 0;
        for r in &self.runs {
            let len = text_edit::units(&r.text);
            let a = start.saturating_sub(offset).min(len);
            let b = end.saturating_sub(offset).min(len);
            if a < b {
                result.push(RichEditRun {
                    text: r.text[text_edit::byte_at(&r.text, a)..text_edit::byte_at(&r.text, b)]
                        .into(),
                    format: r.format.clone(),
                    image: r.image.clone(),
                    mathml: r.mathml.clone(),
                });
            }
            offset += len;
        }
        result
    }
    fn compact(&mut self) {
        let mut out: Vec<RichEditRun> = vec![];
        for run in self.runs.drain(..).filter(|r| !r.text.is_empty()) {
            if let Some(last) = out.last_mut().filter(|r| {
                r.image.is_none()
                    && r.mathml.is_none()
                    && run.image.is_none()
                    && run.mathml.is_none()
                    && r.format == run.format
            }) {
                last.text.push_str(&run.text);
            } else {
                out.push(run);
            }
        }
        self.runs = out;
    }
    pub fn format(&mut self, start: usize, end: usize, format: &CharacterFormat) {
        let mut runs = self.slice(0, start);
        let mut middle = self.slice(start, end);
        for r in &mut middle {
            r.format.apply(format);
        }
        runs.extend(middle);
        runs.extend(self.slice(end, usize::MAX));
        self.runs = runs;
        self.compact();
    }
    /// Apply a host's plain-text edit while preserving every unaffected run.
    /// Prefer the old selection so repeated text does not move formatting.
    pub fn edited(
        &self,
        old: &str,
        new: &str,
        start: usize,
        length: usize,
        typing: &CharacterFormat,
    ) -> Self {
        let a = text_edit::byte_at(old, start);
        let b = text_edit::byte_at(old, start + length);
        let suffix = &old[b..];
        let (prefix, tail) =
            if new.len() >= a + suffix.len() && new.starts_with(&old[..a]) && new.ends_with(suffix)
            {
                (a, suffix.len())
            } else {
                let prefix = old
                    .chars()
                    .zip(new.chars())
                    .take_while(|(a, b)| a == b)
                    .map(|(c, _)| c.len_utf8())
                    .sum::<usize>();
                let tail = old[prefix..]
                    .chars()
                    .rev()
                    .zip(new[prefix..].chars().rev())
                    .take_while(|(a, b)| a == b)
                    .map(|(c, _)| c.len_utf8())
                    .sum::<usize>();
                (prefix, tail)
            };
        let begin = text_edit::units(&old[..prefix]);
        let end = text_edit::units(&old[..old.len() - tail]);
        let inserted = &new[prefix..new.len() - tail];
        let mut doc = self.clone();
        let mut runs = self.slice(0, begin);
        if !inserted.is_empty() {
            runs.push(RichEditRun {
                text: inserted.into(),
                format: typing.clone(),
                ..Default::default()
            });
        }
        runs.extend(self.slice(end, usize::MAX));
        doc.runs = runs;
        doc.compact();
        let pi = old[..prefix].matches('\n').count();
        let removed = old[prefix..old.len() - tail].matches('\n').count();
        let added = inserted.matches('\n').count();
        let count = old.matches('\n').count() + 1;
        doc.paragraphs.resize(count, ParagraphFormat::default());
        let inherited = doc.paragraphs[pi].clone();
        doc.paragraphs.splice(
            pi + 1..pi + 1 + removed,
            std::iter::repeat_n(inherited, added),
        );
        doc
    }
    pub fn replace_document(&self, start: usize, length: usize, insert: &Self) -> Self {
        let old = self.text();
        let end = start + length;
        let next = format!(
            "{}{}{}",
            &old[..text_edit::byte_at(&old, start)],
            insert.text(),
            &old[text_edit::byte_at(&old, end)..]
        );
        let mut doc = self.edited(&old, &next, start, length, &CharacterFormat::default());
        doc.runs = self.slice(0, start);
        doc.runs.extend(insert.runs.clone());
        doc.runs.extend(self.slice(end, usize::MAX));
        doc.compact();
        let paragraph = old[..text_edit::byte_at(&old, start)].matches('\n').count();
        for (i, format) in insert.paragraphs.iter().enumerate() {
            if let Some(p) = doc.paragraphs.get_mut(paragraph + i) {
                *p = format.clone();
            }
        }
        doc
    }
}
#[derive(Deserialize)]
#[serde(tag = "action", rename_all = "camelCase", deny_unknown_fields)]
pub enum RichEditCommand {
    LoadRtf {
        rtf: String,
    },
    LoadRtfBytes {
        bytes: Vec<u8>,
    },
    InsertRtf {
        rtf: String,
    },
    InsertImage {
        image: objects::ImageInput,
        #[serde(default)]
        generation: Option<u32>,
    },
    SetMathML {
        mathml: String,
    },
    InsertMathML {
        mathml: String,
    },
    ReplaceDocument {
        document: RichEditDocument,
    },
    Format {
        format: CharacterFormat,
    },
    Paragraph {
        format: ParagraphFormatPatch,
    },
    Replace {
        text: String,
    },
    ToggleBold,
    ToggleItalic,
    ToggleUnderline,
    Navigate {
        key: String,
        #[serde(default)]
        extend: bool,
        #[serde(default)]
        control: bool,
    },
    Scroll {
        x: f64,
        y: f64,
    },
}
impl Scene {
    pub(super) fn sync_rich_editor_scroll(&mut self, id: u32) {
        let n = self.nodes.get_mut(&id).unwrap();
        let e = &n.editor;
        n.scroll.viewport = [e.view.width, e.view.height];
        n.scroll.extent = [e.text_width, e.text_height];
        n.scroll.x.set(e.scroll_x, self.time, false);
        n.scroll.y.set(e.scroll_y, self.time, false);
    }

    pub(super) fn rich_editor_scroll_to(&mut self, id: u32, x: f64, y: f64) {
        let n = self.nodes.get_mut(&id).unwrap();
        let max = n.scroll.max(self.time);
        let e = &mut n.editor;
        e.scroll_x = if n.props.horizontal_scroll_mode != ScrollMode::Disabled
            && n.props.horizontal_scroll_bar_visibility != ScrollBarVisibility::Disabled {
            x.clamp(0., max[0])
        } else { 0. };
        e.scroll_y = if n.props.vertical_scroll_mode != ScrollMode::Disabled
            && n.props.vertical_scroll_bar_visibility != ScrollBarVisibility::Disabled {
            y.clamp(0., max[1])
        } else { 0. };
        e.manual_scroll = true;
        n.scroll.activity(self.time, self.reduced_motion);
        self.invalidate(id, true);
    }

    pub(super) fn rich_edit_command(
        &mut self,
        id: u32,
        command: RichEditCommand,
    ) -> Result<(), String> {
        let n = self.get(id)?;
        if n.kind != NodeKind::RichEditBox {
            return Err("rich editing requires RichEditBox".into());
        }
        if !self.effective_enabled(id) {
            return Ok(());
        }
        if let RichEditCommand::Scroll { x, y } = command {
            if !x.is_finite() || !y.is_finite() {
                return Err("invalid editor scroll delta".into());
            }
            let e = &self.nodes[&id].editor;
            self.rich_editor_scroll_to(id, e.scroll_x + x, e.scroll_y + y);
            return Ok(());
        }
        if let RichEditCommand::Navigate {
            key,
            extend,
            control,
        } = command
        {
            return self.rich_edit_navigate(id, &key, extend, control);
        }
        if n.props.is_read_only {
            return Ok(());
        }
        if n.editor.draft.is_some() {
            return Err("finish composition before formatting".into());
        }
        match &command {
            RichEditCommand::LoadRtfBytes { bytes } => {
                return self.rich_replace_document(id, rtf::decode_bytes(bytes)?, true)
            }
            RichEditCommand::LoadRtf { rtf } | RichEditCommand::InsertRtf { rtf } => {
                let document = rtf::decode(rtf)?;
                return self.rich_replace_document(
                    id,
                    document,
                    matches!(command, RichEditCommand::LoadRtf { .. }),
                );
            }
            RichEditCommand::SetMathML { mathml } | RichEditCommand::InsertMathML { mathml } => {
                math::parse(mathml)?;
                let document = RichEditDocument {
                    runs: vec![RichEditRun {
                        text: objects::OBJECT.into(),
                        mathml: Some(mathml.clone()),
                        format: n.editor.typing_format.clone(),
                        ..Default::default()
                    }],
                    ..Default::default()
                };
                return self.rich_replace_document(
                    id,
                    document,
                    matches!(command, RichEditCommand::SetMathML { .. }),
                );
            }
            RichEditCommand::InsertImage { image, generation } => {
                if generation.is_some_and(|g| g != n.editor.generation) {
                    return Ok(());
                }
                let image = image.resolve()?;
                return self.rich_replace_document(
                    id,
                    RichEditDocument {
                        runs: vec![RichEditRun {
                            text: objects::OBJECT.into(),
                            image: Some(image),
                            format: n.editor.typing_format.clone(),
                            ..Default::default()
                        }],
                        ..Default::default()
                    },
                    false,
                );
            }
            RichEditCommand::ReplaceDocument { document } => {
                return self.rich_replace_document(id, document.clone(), false)
            }
            _ => {}
        }
        let (start, len) = (n.props.selection_start, n.props.selection_length);
        if let RichEditCommand::Replace { text } = command {
            if text.len() > 1_000_000 {
                return Err("RichEditBox replacement exceeds limit".into());
            }
            let value = &n.props.text;
            let text = text.replace("\r\n", "\n").replace('\r', "\n");
            let next = format!(
                "{}{}{}",
                &value[..text_edit::byte_at(value, start)],
                text,
                &value[text_edit::byte_at(value, start + len)..]
            );
            return self.editor_commit(
                id,
                next,
                start + text_edit::units(&text),
                0,
                "insertReplacementText".into(),
            );
        }
        let mut doc = n.props.document.as_deref().cloned().unwrap_or_default();
        let mut typing = n.editor.typing_format.clone();
        match command {
            RichEditCommand::Paragraph { format } => {
                let from = n.props.text[..text_edit::byte_at(&n.props.text, start)]
                    .matches('\n')
                    .count();
                // A selection ending at the next paragraph's start excludes it.
                let end = if len > 0 { start + len - 1 } else { start };
                let to = n.props.text[..text_edit::byte_at(&n.props.text, end)]
                    .matches('\n')
                    .count();
                doc.paragraphs.resize(
                    n.props.text.matches('\n').count() + 1,
                    ParagraphFormat::default(),
                );
                for p in &mut doc.paragraphs[from..=to] {
                    if let Some(alignment) = format.alignment {
                        p.alignment = alignment;
                    }
                    if let Some(list_style) = format.list_style {
                        p.list_style = list_style;
                    }
                }
            }
            command => {
                let mut format = match &command {
                    RichEditCommand::Format { format } => format.clone(),
                    _ => CharacterFormat::default(),
                };
                // Toggle on unless every selected character already has the effect.
                let selected = doc.slice(start, start + len);
                let all = |field: fn(&CharacterFormat) -> Option<bool>, fallback: bool| {
                    if len == 0 {
                        field(&typing).unwrap_or(fallback)
                    } else {
                        !selected.is_empty()
                            && selected
                                .iter()
                                .all(|r| field(&r.format).unwrap_or(fallback))
                    }
                };
                match command {
                    RichEditCommand::ToggleBold => {
                        format.bold = Some(!all(|f| f.bold, n.props.font_weight >= 600))
                    }
                    RichEditCommand::ToggleItalic => {
                        format.italic =
                            Some(!all(|f| f.italic, n.props.font_style != FontStyle::Normal))
                    }
                    RichEditCommand::ToggleUnderline => {
                        format.underline = Some(!all(|f| f.underline, false))
                    }
                    _ => {}
                }
                format.validate()?;
                if len > 0 {
                    doc.format(start, start + len, &format);
                }
                typing.apply(&format);
            }
        }
        doc.validate()?;
        if n.props.document.as_deref() != Some(&doc) || n.editor.typing_format != typing {
            let previous = self.nodes[&id].props.clone();
            self.nodes
                .get_mut(&id)
                .unwrap()
                .editor
                .push_revision(&previous);
            let n = self.nodes.get_mut(&id).unwrap();
            n.props.document = Some(Box::new(doc));
            n.editor.typing_format = typing;
            n.editor.last_type.clear();
            self.invalidate(id, true);
            self.emit(id, EventKind::TextChanged);
        }
        Ok(())
    }
}

impl Scene {
    fn rich_replace_document(
        &mut self,
        id: u32,
        insert: RichEditDocument,
        whole: bool,
    ) -> Result<(), String> {
        insert.validate()?;
        let n = &self.nodes[&id];
        let old = &n.props;
        let (start, length) = if whole {
            (0, text_edit::units(&old.text))
        } else {
            (old.selection_start, old.selection_length)
        };
        let document = if whole {
            insert.clone()
        } else {
            old.document
                .as_ref()
                .unwrap()
                .replace_document(start, length, &insert)
        };
        document.validate()?;
        let text = document.text();
        if text.len() > 1_000_000 || old.max_length > 0 && text_edit::units(&text) > old.max_length
        {
            return Err("rich insertion exceeds editor text limit".into());
        }
        if old.document.as_deref() == Some(&document) {
            return Ok(());
        }
        let previous = old.clone();
        let n = self.nodes.get_mut(&id).unwrap();
        n.editor.push_revision(&previous);
        n.props.document = Some(Box::new(document));
        n.props.text = text;
        n.editor.draft = None;
        n.editor.generation = n.editor.generation.wrapping_add(1);
        n.editor.last_type.clear();
        n.editor.manual_scroll = false;
        self.editor_select(id, start + text_edit::units(&insert.text()), 0)?;
        self.invalidate(id, true);
        self.emit(id, EventKind::TextChanged);
        Ok(())
    }
    pub fn rich_edit_rtf(&self, id: u32) -> Result<String, String> {
        let n = self.get(id)?;
        if n.kind != NodeKind::RichEditBox {
            return Err("RTF requires RichEditBox".into());
        }
        rtf::encode(n.props.document.as_ref().unwrap(), &n.props)
    }
    pub fn rich_edit_mathml(&self, id: u32) -> Result<String, String> {
        let n = self.get(id)?;
        if n.kind != NodeKind::RichEditBox {
            return Err("MathML requires RichEditBox".into());
        }
        let doc = n.props.document.as_ref().unwrap();
        if doc.runs.iter().any(|r| r.image.is_some()) {
            return Err(
                "MathML export cannot contain raster images; use RTF or document export".into(),
            );
        }
        Ok(math::document_xml(doc))
    }
}

impl Scene {
    fn rich_edit_navigate(
        &mut self,
        id: u32,
        key: &str,
        extend: bool,
        control: bool,
    ) -> Result<(), String> {
        let n = &self.nodes[&id];
        let p = &n.props;
        let e = &n.editor;
        if e.draft.is_some() {
            return Ok(());
        }
        let len = text_edit::units(&p.text);
        let start = p.selection_start;
        let end = start + p.selection_length;
        let active = if e.backward { start } else { end };
        let anchor = if e.backward { end } else { start };
        let mut position = 0;
        let mut boundaries = p
            .text
            .graphemes(true)
            .map(|g| {
                let at = position;
                position += text_edit::units(g);
                at
            })
            .collect::<Vec<_>>();
        boundaries.push(len);
        let previous = || {
            boundaries
                .iter()
                .rev()
                .copied()
                .find(|&p| p < active)
                .unwrap_or(0)
        };
        let next = || {
            boundaries
                .iter()
                .copied()
                .find(|&p| p > active)
                .unwrap_or(len)
        };
        let line = e
            .lines
            .iter()
            .rposition(|l| active >= l.start && active <= l.end)
            .and_then(|i| e.lines.get(i));
        let at = match key {
            "ArrowLeft" if !extend && p.selection_length > 0 => start,
            "ArrowRight" if !extend && p.selection_length > 0 => end,
            "ArrowLeft" if control => p
                .text
                .unicode_word_indices()
                .map(|(b, _)| text_edit::units(&p.text[..b]))
                .filter(|&i| i < active)
                .next_back()
                .unwrap_or(0),
            "ArrowRight" if control => p
                .text
                .unicode_word_indices()
                .map(|(b, _)| text_edit::units(&p.text[..b]))
                .find(|&i| i > active)
                .unwrap_or(len),
            "ArrowLeft" => previous(),
            "ArrowRight" => next(),
            "Home" if control => 0,
            "End" if control => len,
            "Home" => line.map_or(0, |l| l.start),
            "End" => line.map_or(len, |l| l.end),
            "ArrowUp" | "ArrowDown" | "PageUp" | "PageDown" => {
                let down = matches!(key, "ArrowDown" | "PageDown");
                let delta = if key.starts_with("Page") {
                    e.view.height
                } else {
                    line.map_or(e.line_height, |l| l.height)
                };
                e.hit(
                    e.caret.x,
                    e.caret.y + if down { delta + 0.5 } else { -delta + 0.5 },
                )
            }
            _ => return Err("unsupported RichEditBox navigation key".into()),
        };
        let (from, length) = if extend {
            (anchor.min(at), anchor.abs_diff(at))
        } else {
            (at, 0)
        };
        self.editor_select(id, from, length)?;
        let n = self.nodes.get_mut(&id).unwrap();
        n.editor.backward = extend && at < anchor;
        n.editor.manual_scroll = false;
        Ok(())
    }
}

fn roman(mut n: usize) -> String {
    let mut result = String::new();
    for (v, s) in [
        (1000, "M"),
        (900, "CM"),
        (500, "D"),
        (400, "CD"),
        (100, "C"),
        (90, "XC"),
        (50, "L"),
        (40, "XL"),
        (10, "X"),
        (9, "IX"),
        (5, "V"),
        (4, "IV"),
        (1, "I"),
    ] {
        while n >= v {
            result.push_str(s);
            n -= v;
        }
    }
    result
}
impl text_edit::EditorState {
    pub(super) fn layout_rich_editor(
        &mut self,
        p: &NodeProperties,
        size: (f64, Option<f64>),
        hh: f64,
        dpr: f64,
        m: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        use text_edit::{EditLine, Glyph};
        let (width, height) = size;
        let committed = p.document.as_deref().cloned().unwrap_or_default();
        let doc = self.draft.as_ref().map_or(committed.clone(), |draft| {
            committed.edited(
                &p.text,
                draft,
                p.selection_start,
                p.selection_length,
                &self.typing_format,
            )
        });
        let text = self.draft.as_deref().unwrap_or(&p.text);
        let base = p.font();
        let reference = m.measure("Hg", &base);
        self.line_height = p
            .line_height
            .unwrap_or_else(|| m.line_height(&base, reference));
        let available = (width - p.padding[0] - p.padding[2] - 2.).max(1.);
        self.placeholder = crate::typography::layout(
            &p.placeholder_text,
            &base,
            available,
            p.wrap,
            p.trimming,
            p.line_height,
            m,
        );
        let mut lines = vec![];
        let mut line = EditLine::default();
        let mut offset = 0;
        let mut paragraph = 0;
        let mut previous = String::new();
        let mut previous_format = CharacterFormat::default();
        let mut run = 0;
        let mut run_end = doc.runs.first().map_or(0, |r| text_edit::units(&r.text));
        for g in text.graphemes(true) {
            let end = offset + text_edit::units(g);
            if g == "\n" {
                line.end = offset;
                line.paragraph = paragraph;
                lines.push(line);
                paragraph += 1;
                line = EditLine {
                    start: end,
                    paragraph,
                    ..Default::default()
                };
                offset = end;
                previous.clear();
                continue;
            }
            while run_end <= offset && run + 1 < doc.runs.len() {
                run += 1;
                run_end += text_edit::units(&doc.runs[run].text);
            }
            let format = doc
                .runs
                .get(run)
                .map_or_else(CharacterFormat::default, |r| r.format.clone());
            let font = format.font(p);
            let object = if let Some(r) = doc.runs.get(run) {
                if let Some(image) = &r.image {
                    Some(std::sync::Arc::new(objects::InlineVisual::Image(
                        image.clone(),
                    )))
                } else if let Some(xml) = &r.mathml {
                    if self.math_cache.len() > 64 {
                        self.math_cache.clear();
                    }
                    let node = self
                        .math_cache
                        .entry(xml.clone())
                        .or_insert_with(|| math::parse(xml).expect("validated MathML"));
                    Some(std::sync::Arc::new(objects::InlineVisual::Math(
                        math::layout(node, &font, m),
                    )))
                } else {
                    None
                }
            } else {
                None
            };
            let tracking = p.character_spacing * font.size / 1000.;
            let mut advance = m.measure(g, &font).width;
            if object.is_some() {
                advance = object.as_ref().unwrap().size()[0];
            }
            if object.is_none() && !previous.is_empty() && previous_format == format {
                advance = m.measure(&format!("{previous}{g}"), &font).width
                    - m.measure(&previous, &font).width;
            }
            let list = doc
                .paragraphs
                .get(paragraph)
                .is_some_and(|f| f.list_style != RichEditListStyle::None);
            let content = (available - if list { base.size * 2. } else { 0. }).max(1.);
            if p.wrap && line.width + advance > content && !line.glyphs.is_empty() {
                let carry = if let Some(at) = line
                    .glyphs
                    .iter()
                    .rposition(|v| v.text.chars().all(char::is_whitespace))
                {
                    line.glyphs.split_off(at + 1)
                } else {
                    vec![]
                };
                line.end = line.glyphs.last().map_or(offset, |g| g.end);
                line.width = line.glyphs.last().map_or(0., |g| g.x + g.width);
                lines.push(line);
                line = EditLine {
                    start: carry.first().map_or(offset, |g| g.start),
                    paragraph,
                    ..Default::default()
                };
                for mut glyph in carry {
                    glyph.x = line.width;
                    line.width += glyph.width;
                    line.glyphs.push(glyph);
                }
                previous.clear();
            }
            line.glyphs.push(Glyph {
                text: g.into(),
                start: offset,
                end,
                x: line.width,
                width: advance + tracking,
                format: format.clone(),
                object: object.clone(),
            });
            line.width += advance + tracking;
            line.end = end;
            offset = end;
            previous = if object.is_some() {
                String::new()
            } else {
                g.into()
            };
            previous_format = format;
        }
        lines.push(line);
        let mut y = 0_f64;
        let mut max_width = 0_f64;
        let mut last_paragraph = None;
        let mut number = 0;
        for line in &mut lines {
            let format = doc
                .paragraphs
                .get(line.paragraph)
                .cloned()
                .unwrap_or_default();
            let first = last_paragraph != Some(line.paragraph);
            if first {
                if format.list_style == RichEditListStyle::None {
                    number = 0;
                } else {
                    number += 1;
                }
            }
            if first {
                line.marker = match format.list_style {
                    RichEditListStyle::Bullet => "•".into(),
                    RichEditListStyle::Decimal => format!("{number}."),
                    RichEditListStyle::UpperRoman => format!("{}.", roman(number)),
                    _ => String::new(),
                };
            }
            last_paragraph = Some(line.paragraph);
            let indent = if format.list_style == RichEditListStyle::None {
                0.
            } else {
                base.size * 2.
            };
            let shift = indent
                + match format.alignment {
                    RichEditAlignment::Left => 0.,
                    RichEditAlignment::Center => ((available - indent - line.width) / 2.).max(0.),
                    RichEditAlignment::Right => (available - indent - line.width).max(0.),
                };
            let mut ascent = reference.ascent;
            let mut descent = reference.descent;
            let mut natural = self.line_height;
            // Resolve display order without changing logical UTF-16 positions.
            let logical = line
                .glyphs
                .iter()
                .map(|g| g.text.as_str())
                .collect::<String>();
            let bidi = unicode_bidi::BidiInfo::new(
                &logical,
                Some(if p.flow_direction == FlowDirection::RightToLeft {
                    unicode_bidi::Level::rtl()
                } else {
                    unicode_bidi::Level::ltr()
                }),
            );
            let mut byte = 0;
            let levels = line
                .glyphs
                .iter()
                .map(|g| {
                    let level = bidi
                        .levels
                        .get(byte)
                        .copied()
                        .unwrap_or(unicode_bidi::Level::ltr());
                    byte += g.text.len();
                    level
                })
                .collect::<Vec<_>>();
            let order = unicode_bidi::BidiInfo::reorder_visual(&levels);
            let mut x = shift;
            for index in order {
                let g = &mut line.glyphs[index];
                g.x = x;
                x += g.width;
                let font = g.format.font(p);
                if let Some(object) = &g.object {
                    let [_, a, d] = object.size();
                    ascent = ascent.max(a);
                    descent = descent.max(d);
                    natural = natural.max(a + d);
                    continue;
                }
                let metrics = m.measure("Hg", &font);
                ascent = ascent.max(metrics.ascent);
                descent = descent.max(metrics.descent);
                natural = natural.max(m.line_height(&font, metrics));
            }
            line.glyphs.sort_by(|a, b| a.x.total_cmp(&b.x));
            line.y = y;
            line.height = p.line_height.unwrap_or(natural.max(ascent + descent));
            line.baseline = y + ascent;
            y += line.height;
            max_width = max_width.max(x);
        }
        self.lines = lines;
        self.text_height = y;
        self.text_width = max_width;
        let ceil = |v: f64| (v * dpr - 1e-9).ceil() / dpr;
        let body = ceil(ceil(y) + p.padding[1] + p.padding[3] + 2.).max(p.min_height);
        self.view = Rect::new(
            1. + p.padding[0],
            hh + 1. + p.padding[1],
            available,
            (height.unwrap_or(hh + body) - hh - p.padding[1] - p.padding[3] - 2.).max(1.),
        );
        let at = if self.draft.is_some() {
            self.draft_selection.0 + self.draft_selection.1
        } else if self.backward {
            p.selection_start
        } else {
            p.selection_start + p.selection_length
        };
        let row = self
            .lines
            .iter()
            .rposition(|l| at >= l.start && at <= l.end)
            .unwrap_or(self.lines.len() - 1);
        let l = &self.lines[row];
        let x = l
            .glyphs
            .iter()
            .find(|g| at >= g.start && at < g.end)
            .map_or_else(
                || {
                    l.glyphs
                        .iter()
                        .find(|g| g.end == at)
                        .map_or(0., |g| g.x + g.width)
                },
                |g| g.x,
            );
        if !self.manual_scroll {
            if x - self.scroll_x > available - 1. {
                self.scroll_x = x - available + 1.;
            }
            if x < self.scroll_x {
                self.scroll_x = x;
            }
            if l.y + l.height - self.scroll_y > self.view.height {
                self.scroll_y = l.y + l.height - self.view.height;
            }
            if l.y < self.scroll_y {
                self.scroll_y = l.y;
            }
        }
        self.scroll_x = self
            .scroll_x
            .clamp(0., (max_width - available + 1.).max(0.));
        self.scroll_y = self.scroll_y.clamp(0., (y - self.view.height).max(0.));
        self.caret = Rect::new(
            self.view.x + x - self.scroll_x,
            self.view.y + l.y - self.scroll_y,
            1.,
            l.height,
        );
        [max_width + p.padding[0] + p.padding[2] + 2., hh + body]
    }
}
impl Scene {
    pub(super) fn paint_rich_editor(
        &self,
        id: u32,
        out: &mut Vec<crate::render::Draw>,
        foreground: &str,
        highlight: &str,
        start: usize,
        len: usize,
        focused: bool,
    ) {
        use crate::render::Draw;
        let n = &self.nodes[&id];
        let e = &n.editor;
        let p = &n.props;
        for line in &e.lines {
            // Paint each continuous visual selection once. Separate fractional
            // glyph fills leave antialiased seams and can cover adjacent ink.
            let mut ranges: Vec<(f64, f64)> = vec![];
            if focused {
                for g in line
                    .glyphs
                    .iter()
                    .filter(|g| g.end > start && g.start < start + len)
                {
                    if let Some(last) = ranges.last_mut().filter(|r| g.x <= r.1 + 1e-7) {
                        last.1 = last.1.max(g.x + g.width);
                    } else {
                        ranges.push((g.x, g.x + g.width));
                    }
                }
            }
            for (left, right) in ranges {
                out.push(Draw::Fill {
                    rect: Rect::new(
                        e.view.x + left - e.scroll_x,
                        e.view.y + line.y - e.scroll_y,
                        right - left,
                        line.height,
                    ),
                    radius: 0.,
                    color: highlight.into(),
                });
            }
            if !line.marker.is_empty() {
                out.push(Draw::Text {
                    style: p.font_style,
                    x: e.view.x - e.scroll_x,
                    y: e.view.y + line.baseline - e.scroll_y,
                    text: line.marker.clone(),
                    color: foreground.into(),
                    size: p.font_size,
                    font: p.font_family.clone(),
                    max_width: p.font_size * 2.,
                    weight: p.font_weight,
                });
            }
            for g in &line.glyphs {
                let selected = focused && g.end > start && g.start < start + len;
                let x = e.view.x + g.x - e.scroll_x;
                let y = e.view.y + line.baseline - e.scroll_y;
                let font = g.format.font(p);
                let color = if selected {
                    crate::resources::Resources::current()
                        .color(
                            n.theme,
                            if n.theme == Theme::HighContrast {
                                "SystemColorHighlightTextColorBrush"
                            } else {
                                "TextOnAccentFillColorPrimaryBrush"
                            },
                        )
                        .to_string()
                } else if n.enabled && n.theme != Theme::HighContrast {
                    g.format
                        .foreground
                        .clone()
                        .unwrap_or_else(|| foreground.into())
                } else {
                    foreground.into()
                };
                if let Some(object) = &g.object {
                    object.paint(
                        out,
                        x,
                        y,
                        &color,
                        selected || !n.enabled || n.theme == Theme::HighContrast,
                    );
                    continue;
                }
                out.push(Draw::Text {
                    style: font.style,
                    x,
                    y,
                    text: g.text.clone(),
                    color: color.clone(),
                    size: font.size,
                    font: font.family,
                    max_width: g.width.max(1.) + 1.,
                    weight: font.weight,
                });
                for (show, offset) in [
                    (g.format.underline == Some(true), font.size * 0.12),
                    (g.format.strikethrough == Some(true), -font.size * 0.3),
                ] {
                    if show {
                        out.push(Draw::Fill {
                            rect: Rect::new(x, y + offset, g.width, (font.size / 14.).max(1.)),
                            radius: 0.,
                            color: color.clone(),
                        });
                    }
                }
            }
        }
    }
}
