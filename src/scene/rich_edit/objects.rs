use super::*;

pub const OBJECT: &str = "\u{fffc}";
pub const MAX_IMAGE_BYTES: usize = 8 * 1024 * 1024;
const BASE64: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
pub fn encode64(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for c in bytes.chunks(3) {
        let n = ((c[0] as u32) << 16)
            | ((c.get(1).copied().unwrap_or(0) as u32) << 8)
            | c.get(2).copied().unwrap_or(0) as u32;
        for i in (0..4).rev() {
            out.push(if 3 - i > c.len() {
                '='
            } else {
                BASE64[((n >> (i * 6)) & 63) as usize] as char
            });
        }
    }
    out
}
pub fn decode64(s: &str) -> Result<Vec<u8>, String> {
    if s.len() > MAX_IMAGE_BYTES.div_ceil(3) * 4 || s.len() % 4 != 0 {
        return Err("invalid or oversized embedded image base64".into());
    }
    let mut out = vec![];
    for (index, c) in s.as_bytes().chunks(4).enumerate() {
        let pad = if c[2] == b'=' {
            2
        } else if c[3] == b'=' {
            1
        } else {
            0
        };
        if c[0] == b'='
            || c[1] == b'='
            || (pad == 2 && c[3] != b'=')
            || (pad > 0 && (index + 1) * 4 != s.len())
        {
            return Err("invalid base64 padding".into());
        }
        let mut n = 0u32;
        for b in c {
            n = (n << 6)
                | if *b == b'=' {
                    0
                } else {
                    BASE64
                        .iter()
                        .position(|v| v == b)
                        .ok_or("invalid base64 character")? as u32
                };
        }
        if (pad == 2 && n & 0xffff != 0) || (pad == 1 && n & 0xff != 0) {
            return Err("non-canonical base64 padding".into());
        }
        out.push((n >> 16) as u8);
        if pad < 2 {
            out.push((n >> 8) as u8);
        }
        if pad == 0 {
            out.push(n as u8);
        }
    }
    Ok(out)
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EmbeddedImage {
    /// Self-contained PNG/JPEG data URL. No remote fetch is needed to restore a document.
    pub source: String,
    pub width: f64,
    pub height: f64,
    #[serde(default)]
    pub alt_text: String,
}
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ImageInput {
    pub source: String,
    pub width: Option<f64>,
    pub height: Option<f64>,
    #[serde(default)]
    pub alt_text: String,
}
impl ImageInput {
    pub fn resolve(&self) -> Result<EmbeddedImage, String> {
        let mut image = EmbeddedImage {
            source: self.source.clone(),
            width: 1.,
            height: 1.,
            alt_text: self.alt_text.clone(),
        };
        let (mime, bytes) = image.bytes()?;
        let [w, h] = image_size(mime, &bytes)?;
        image.width = self
            .width
            .unwrap_or_else(|| self.height.map_or(w, |height| height * w / h));
        image.height = self
            .height
            .unwrap_or_else(|| self.width.map_or(h, |width| width * h / w));
        image.validate()?;
        Ok(image)
    }
}
#[derive(Clone)]
pub enum InlineVisual {
    Image(EmbeddedImage),
    Math(super::math::MathBox),
}
impl InlineVisual {
    pub fn size(&self) -> [f64; 3] {
        match self {
            Self::Image(i) => [i.width, i.height, 0.],
            Self::Math(m) => [m.width, m.ascent, m.descent],
        }
    }
    pub fn paint(
        &self,
        out: &mut Vec<crate::render::Draw>,
        x: f64,
        baseline: f64,
        color: &str,
        force: bool,
    ) {
        match self {
            Self::Image(i) => out.push(crate::render::Draw::Image {
                rect: crate::model::Rect::new(x, baseline - i.height, i.width, i.height),
                source: i.source.clone(),
            }),
            Self::Math(m) => m.paint(out, x, baseline, color, force),
        }
    }
}
impl EmbeddedImage {
    pub fn bytes(&self) -> Result<(&'static str, Vec<u8>), String> {
        for (prefix, mime) in [
            ("data:image/png;base64,", "image/png"),
            ("data:image/jpeg;base64,", "image/jpeg"),
        ] {
            if let Some(raw) = self.source.strip_prefix(prefix) {
                let data = decode64(raw)?;
                image_size(mime, &data)?;
                return Ok((mime, data));
            }
        }
        Err("embedded image must be a PNG/JPEG base64 data URL".into())
    }
    pub fn validate(&self) -> Result<(), String> {
        if !self.width.is_finite()
            || !self.height.is_finite()
            || !(0. ..=8192.).contains(&self.width)
            || !(0. ..=8192.).contains(&self.height)
            || self.width == 0.
            || self.height == 0.
            || self.alt_text.len() > 4096
        {
            return Err("invalid embedded image dimensions or alt text".into());
        }
        // Text edits repeatedly validate the same immutable embedded bytes.
        // Cache successful content fingerprints without retaining large URLs.
        use std::hash::{Hash, Hasher};
        static VALIDATED: std::sync::OnceLock<
            std::sync::Mutex<std::collections::HashSet<(u64, usize)>>,
        > = std::sync::OnceLock::new();
        let mut hash = std::collections::hash_map::DefaultHasher::new();
        self.source.hash(&mut hash);
        let key = (hash.finish(), self.source.len());
        let cache = VALIDATED.get_or_init(Default::default);
        if cache.lock().unwrap().contains(&key) {
            return Ok(());
        }
        self.bytes()?;
        let mut cached = cache.lock().unwrap();
        if cached.len() >= 64 {
            cached.clear();
        }
        cached.insert(key);
        Ok(())
    }
    pub fn from_bytes(mime: &str, bytes: &[u8], size: Option<[f64; 2]>) -> Result<Self, String> {
        let natural = image_size(mime, bytes)?;
        let [width, height] = size.unwrap_or(natural);
        let value = Self {
            source: format!("data:{mime};base64,{}", encode64(bytes)),
            width,
            height,
            alt_text: String::new(),
        };
        value.validate()?;
        Ok(value)
    }
}
pub fn image_size(mime: &str, data: &[u8]) -> Result<[f64; 2], String> {
    if data.len() > MAX_IMAGE_BYTES {
        return Err("embedded image exceeds 8 MiB".into());
    }
    let size = if mime == "image/png"
        && data.len() >= 33
        && &data[..8] == b"\x89PNG\r\n\x1a\n"
        && &data[12..16] == b"IHDR"
    {
        let mut at = 8;
        let mut idat = false;
        let mut ended = false;
        while at + 12 <= data.len() {
            let len = u32::from_be_bytes(data[at..at + 4].try_into().unwrap()) as usize;
            let end = at
                .checked_add(len)
                .and_then(|v| v.checked_add(12))
                .filter(|v| *v <= data.len())
                .ok_or("truncated PNG chunk")?;
            let mut crc = 0xffffffffu32;
            for byte in &data[at + 4..end - 4] {
                crc ^= *byte as u32;
                for _ in 0..8 {
                    crc = (crc >> 1) ^ if crc & 1 != 0 { 0xedb88320 } else { 0 };
                }
            }
            if !crc != u32::from_be_bytes(data[end - 4..end].try_into().unwrap()) {
                return Err("invalid PNG checksum".into());
            }
            let kind = &data[at + 4..at + 8];
            if at == 8 && (kind != b"IHDR" || len != 13) {
                return Err("invalid PNG header".into());
            }
            if kind == b"IDAT" {
                idat = true;
            }
            if kind == b"IEND" {
                if len != 0 || end != data.len() {
                    return Err("invalid PNG end chunk".into());
                }
                ended = true;
                break;
            }
            at = end;
        }
        if !idat || !ended {
            return Err("PNG needs image data and end chunks".into());
        }
        [
            u32::from_be_bytes(data[16..20].try_into().unwrap()),
            u32::from_be_bytes(data[20..24].try_into().unwrap()),
        ]
    } else if mime == "image/jpeg" && data.starts_with(&[255, 216]) && data.ends_with(&[255, 217]) {
        let mut at = 2;
        let mut size = None;
        while at + 4 <= data.len() {
            if data[at] != 255 {
                return Err("invalid JPEG marker".into());
            }
            while at < data.len() && data[at] == 255 {
                at += 1;
            }
            if at >= data.len() {
                break;
            }
            let marker = data[at];
            at += 1;
            if marker == 0xd9 || marker == 0xda {
                break;
            }
            if marker == 0x01 || (0xd0..=0xd7).contains(&marker) {
                continue;
            }
            if at + 2 > data.len() {
                break;
            }
            let len = u16::from_be_bytes([data[at], data[at + 1]]) as usize;
            if len < 2 || at + len > data.len() {
                return Err("truncated JPEG segment".into());
            }
            if [
                0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
            ]
            .contains(&marker)
                && len >= 8
            {
                size = Some([
                    u16::from_be_bytes([data[at + 5], data[at + 6]]) as u32,
                    u16::from_be_bytes([data[at + 3], data[at + 4]]) as u32,
                ]);
                break;
            }
            at += len;
        }
        size.ok_or("JPEG has no supported frame header")?
    } else {
        return Err("invalid PNG/JPEG signature".into());
    };
    if size[0] == 0
        || size[1] == 0
        || size[0] > 8192
        || size[1] > 8192
        || size[0] as u64 * size[1] as u64 > 32_000_000
    {
        return Err("embedded image pixel dimensions exceed limits".into());
    }
    Ok(size.map(|v| v as f64))
}
