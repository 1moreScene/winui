use super::*;
use crate::{
    render::Draw,
    resources::{Brush, Resources},
    typography::{self},
};
use std::sync::OnceLock;
use unicode_segmentation::UnicodeSegmentation;

pub fn is_editor(kind: NodeKind) -> bool {
    matches!(kind, NodeKind::TextBox | NodeKind::PasswordBox | NodeKind::RichEditBox)
}
pub fn contract() -> &'static serde_json::Value {
    static V: OnceLock<serde_json::Value> = OnceLock::new();
    V.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/text-scroll-template.json")).unwrap()
    })
}
pub fn metrics() -> &'static serde_json::Value {
    static V: OnceLock<serde_json::Value> = OnceLock::new();
    V.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/text-scroll-metrics.json")).unwrap()
    })
}
pub struct Defaults {
    pub padding: [f64; 4],
    pub min_width: f64,
    pub min_height: f64,
    pub radius: f64,
}
pub fn native_defaults() -> Defaults {
    let r = &metrics()["matrix"][0];
    let p = &r["padding"];
    Defaults {
        padding: [
            p["Left"].as_f64().unwrap(),
            p["Top"].as_f64().unwrap(),
            p["Right"].as_f64().unwrap(),
            p["Bottom"].as_f64().unwrap(),
        ],
        min_width: r["minWidth"].as_f64().unwrap(),
        min_height: r["minHeight"].as_f64().unwrap(),
        radius: r["cornerRadius"]["TopLeft"].as_f64().unwrap(),
    }
}
pub fn resource(theme: Theme, key: &str) -> &'static Brush {
    Resources::current()
        .resolve(theme, key)
        .expect("native text/scroll brush")
}
pub fn units(s: &str) -> usize {
    s.encode_utf16().count()
}
pub fn byte_at(s: &str, index: usize) -> usize {
    let mut pos = 0;
    for (byte, c) in s.char_indices() {
        if pos >= index {
            return byte;
        }
        if pos + c.len_utf16() > index {
            return byte;
        }
        pos += c.len_utf16();
    }
    s.len()
}
pub fn boundary(s: &str, index: usize) -> usize {
    units(&s[..byte_at(s, index)])
}
#[derive(Clone)]
struct Revision {
    document: Option<Box<rich_edit::RichEditDocument>>,
    typing: rich_edit::CharacterFormat,
    text: String,
    start: usize,
    length: usize,
}
#[derive(Clone, Default)]
pub struct Glyph {
    pub object: Option<std::sync::Arc<rich_edit::objects::InlineVisual>>,
    pub format: rich_edit::CharacterFormat,
    pub text: String,
    pub start: usize,
    pub end: usize,
    pub x: f64,
    pub width: f64,
}
#[derive(Clone, Default)]
pub struct EditLine {
    pub y: f64,
    pub height: f64,
    pub marker: String,
    pub paragraph: usize,
    pub text: String,
    pub glyphs: Vec<Glyph>,
    pub start: usize,
    pub end: usize,
    pub width: f64,
    pub baseline: f64,
}
#[derive(Default)]
pub struct EditorState {
    pub manual_scroll: bool,
    pub math_cache: HashMap<String,rich_edit::math::MathNode>,
    pub typing_format: rich_edit::CharacterFormat,
    undo: Vec<Revision>,
    redo: Vec<Revision>,
    pub(super) last_type: String,
    last_edit: f64,
    pub draft: Option<String>,
    pub draft_selection: (usize, usize),
    pub backward: bool,
    pub generation: u32,
    pub helper_hover: bool,
    pub helper_pressed: bool,
    pub helper_button: Rect,
    pub helper_mask: Rect,
    pub helper_glyph: [f64; 2],
    pub user_edited: bool,
    pub peek: bool,
    pub blink_start: f64,
    pub placeholder: TextLayout,
    pub lines: Vec<EditLine>,
    pub line_height: f64,
    pub text_width: f64,
    pub text_height: f64,
    pub view: Rect,
    pub caret: Rect,
    pub scroll_x: f64,
    pub scroll_y: f64,
    pub drag_anchor: Option<usize>,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorSnapshot {
    pub scrollable_x: f64,
    pub scrollable_y: f64,
    pub character_format: rich_edit::CharacterFormat,
    pub view: Rect,
    pub caret: Rect,
    pub scroll_x: f64,
    pub scroll_y: f64,
    pub revealed: bool,
    pub clear_visible: bool,
    pub reveal_visible: bool,
    pub can_undo: bool,
    pub can_redo: bool,
    pub backward: bool,
    pub generation: u32,
    pub helper_button: Option<Rect>,
    pub helper_mask: Option<Rect>,
}
impl EditorState {
    pub(super) fn push_revision(&mut self,p:&NodeProperties) {
        if self.undo.len()>=100 {self.undo.remove(0);}
        self.undo.push(Revision{text:p.text.clone(),start:p.selection_start,length:p.selection_length,document:p.document.clone(),typing:self.typing_format.clone()});
        self.redo.clear();
    }
    pub fn logical(kind: NodeKind, p: &NodeProperties) -> &str {
        if kind == NodeKind::PasswordBox {
            &p.password
        } else {
            &p.text
        }
    }
    pub fn revealed(&self, p: &NodeProperties) -> bool {
        p.password_reveal_mode == PasswordRevealMode::Visible
            || (p.password_reveal_mode == PasswordRevealMode::Peek && self.peek)
    }
    pub fn helper(&self, kind: NodeKind, p: &NodeProperties, focused: bool) -> bool {
        kind != NodeKind::RichEditBox
            && focused
            && !Self::logical(kind, p).is_empty()
            && !p.is_read_only
            && if kind == NodeKind::PasswordBox {
                p.password_reveal_mode == PasswordRevealMode::Peek && self.user_edited
            } else {
                !p.accepts_return && !p.wrap
            }
    }
    pub fn snapshot(&self, kind: NodeKind, p: &NodeProperties, focused: bool) -> EditorSnapshot {
        let helper = self.helper(kind, p, focused);
        EditorSnapshot {
            scrollable_x:(self.text_width-self.view.width+1.).max(0.),
            scrollable_y:(self.text_height-self.view.height).max(0.),
            character_format: self.typing_format.clone(),
            view: self.view,
            caret: self.caret,
            scroll_x: self.scroll_x,
            scroll_y: self.scroll_y,
            revealed: self.revealed(p),
            clear_visible: kind == NodeKind::TextBox && helper,
            reveal_visible: kind == NodeKind::PasswordBox && helper,
            can_undo: !self.undo.is_empty(),
            can_redo: !self.redo.is_empty(),
            backward: self.backward,
            generation: self.generation,
            helper_button: helper.then_some(self.helper_button),
            helper_mask: helper.then_some(self.helper_mask),
        }
    }
    pub fn reset_programmatic(&mut self) {
        self.generation = self.generation.wrapping_add(1);
        self.backward = false;
        self.manual_scroll=false;
        self.typing_format = Default::default();
        self.undo.clear();
        self.redo.clear();
        self.last_type.clear();
        self.draft = None;
        self.user_edited = false;
        self.peek = false;
    }
    #[allow(clippy::too_many_arguments)]
    pub fn layout(
        &mut self,
        kind: NodeKind,
        p: &NodeProperties,
        size: (f64, Option<f64>),
        focused: bool,
        header_height: f64,
        dpr: f64,
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        if kind == NodeKind::RichEditBox {return self.layout_rich_editor(p,size,header_height,dpr,measure);}
        let (width, height) = size;
        let font = p.font();
        let reference = measure.measure("Hg", &font);
        self.line_height = p
            .line_height
            .unwrap_or_else(|| measure.line_height(&font, reference));
        // The native ContentElement first measures its text viewport in
        // physical pixels; its padding and template border are then measured
        // by the outer Grid. Rounding only the final DIP sum loses a pixel at
        // fractional scale (including every default 125% composed editor).
        let ceil_pixel = |v: f64| (v * dpr - 1e-9).ceil() / dpr;
        let natural_body =
            ceil_pixel(ceil_pixel(self.line_height) + p.padding[1] + p.padding[3] + 2.)
                .max(p.min_height);
        let helper = if self.helper(kind, p, focused) {
            (height.unwrap_or(header_height + natural_body) - header_height).max(0.)
        } else {
            0.
        };
        let x = 1. + p.padding[0];
        let y = header_height + 1. + p.padding[1];
        let available = (width - x - 1. - p.padding[2] - helper).max(1.);
        let value = self
            .draft
            .as_deref()
            .unwrap_or_else(|| Self::logical(kind, p));
        self.placeholder = typography::layout(
            &p.placeholder_text,
            &font,
            available,
            p.wrap,
            p.trimming,
            p.line_height,
            measure,
        );
        let tracking = p.character_spacing * p.font_size / 1000.;
        let masked = kind == NodeKind::PasswordBox && !self.revealed(p);
        self.lines.clear();
        let mut line = EditLine::default();
        let mut index = 0;
        let mut previous = String::new();
        for g in value.graphemes(true) {
            let end = index + units(g);
            if g == "\n" || g == "\r\n" {
                line.end = index;
                self.lines.push(line);
                line = EditLine {
                    start: end,
                    ..Default::default()
                };
                previous.clear();
                index = end;
                continue;
            }
            let text = if masked {
                p.password_char.clone()
            } else {
                g.to_string()
            };
            let mut advance = measure.measure(&text, &font).width;
            if !previous.is_empty() {
                advance += measure.measure(&format!("{previous}{text}"), &font).width
                    - measure.measure(&previous, &font).width
                    - measure.measure(&text, &font).width;
            }
            if p.wrap && line.width + advance > available && !line.glyphs.is_empty() {
                // Prefer a Unicode whitespace boundary, retaining all UTF-16 positions.
                if let Some(at) = line
                    .glyphs
                    .iter()
                    .rposition(|g| g.text.chars().all(char::is_whitespace))
                {
                    let carry = line.glyphs.split_off(at + 1);
                    line.text = line.glyphs.iter().map(|g| g.text.as_str()).collect();
                    line.end = line.glyphs.last().unwrap().end;
                    line.width = line.glyphs.last().map_or(0., |g| g.x + g.width);
                    self.lines.push(line);
                    line = EditLine {
                        start: carry.first().map_or(index, |g| g.start),
                        ..Default::default()
                    };
                    for mut g in carry {
                        g.x = line.width;
                        line.width += g.width + tracking;
                        line.text.push_str(&g.text);
                        line.glyphs.push(g);
                    }
                } else {
                    line.end = index;
                    self.lines.push(line);
                    line = EditLine {
                        start: index,
                        ..Default::default()
                    };
                }
            }
            let at = line.width;
            line.text.push_str(&text);
            line.glyphs.push(Glyph {
                text: text.clone(),
                start: index,
                end,
                x: at,
                width: advance,
                ..Default::default()
            });
            line.width += advance + tracking;
            line.end = end;
            index = end;
            previous = text;
        }
        self.lines.push(line);
        self.text_width = 0.;
        for (i, line) in self.lines.iter_mut().enumerate() {
            let exact = measure.measure(&line.text, &font).width
                + tracking * line.glyphs.len().saturating_sub(1) as f64;
            let estimate = line.glyphs.last().map_or(0., |g| g.x + g.width);
            if estimate > 0. {
                for glyph in &mut line.glyphs {
                    glyph.x *= exact / estimate;
                    glyph.width *= exact / estimate;
                }
            }
            line.width = exact;
            line.baseline = i as f64 * self.line_height + reference.ascent;
            self.text_width = self.text_width.max(exact);
        }
        self.text_height = self.lines.len() as f64 * self.line_height;
        let body = ceil_pixel(ceil_pixel(self.text_height) + p.padding[1] + p.padding[3] + 2.)
            .max(p.min_height);
        let h = height.unwrap_or(header_height + body);
        let bh = (h - header_height).max(0.);
        // C++ OnDeleteButtonSizeChanged / OnRevealButtonSizeChanged makes the
        // button square. The template's inner Grid has margin 0,4,4,4 and
        // a 1 DIP transparent border; only its inner background is highlighted.
        let helper_right = width - p.editor_helper_right_inset;
        self.helper_button = Rect::new(helper_right - bh, header_height, bh, bh);
        let margin: Vec<f64> = contract()["scalars"]["TextBoxInnerButtonMargin"]
            .as_str()
            .unwrap()
            .split(',')
            .map(|v| v.parse().unwrap())
            .collect();
        self.helper_mask = Rect::new(
            helper_right - bh + margin[0] + 1.,
            header_height + margin[1] + 1.,
            (bh - margin[0] - margin[2] - 2.).max(0.),
            (bh - margin[1] - margin[3] - 2.).max(0.),
        );
        self.helper_glyph = [
            helper_right - bh + (bh - margin[2] - 12.) / 2.,
            header_height + bh / 2. + 6.,
        ];

        self.view = Rect::new(
            x,
            y,
            available,
            (h - header_height - p.padding[1] - p.padding[3] - 2.).max(1.),
        );
        let caret_index = if self.draft.is_some() {
            self.draft_selection.0 + self.draft_selection.1
        } else if self.backward {
            p.selection_start
        } else {
            p.selection_start + p.selection_length
        };
        let row = self
            .lines
            .iter()
            .position(|l| caret_index >= l.start && caret_index <= l.end)
            .unwrap_or(self.lines.len() - 1);
        let l = &self.lines[row];
        let caret_x = l
            .glyphs
            .iter()
            .find(|g| caret_index < g.end)
            .map_or(l.width, |g| g.x);
        if caret_x - self.scroll_x > available - 1. {
            self.scroll_x = (caret_x - available + 1.).max(0.);
        }
        if caret_x < self.scroll_x {
            self.scroll_x = caret_x;
        }
        let caret_y = row as f64 * self.line_height;
        if caret_y + self.line_height - self.scroll_y > self.view.height {
            self.scroll_y = (caret_y + self.line_height - self.view.height).max(0.);
        }
        if caret_y < self.scroll_y {
            self.scroll_y = caret_y;
        }
        self.scroll_x = self
            .scroll_x
            .clamp(0., (self.text_width - available + 1.).max(0.));
        self.scroll_y = self
            .scroll_y
            .clamp(0., (self.text_height - self.view.height).max(0.));
        self.caret = Rect::new(
            x + caret_x - self.scroll_x,
            y + caret_y - self.scroll_y,
            1.,
            self.line_height,
        );
        [
            self.text_width + x + p.padding[2] + 1. + helper,
            header_height + body,
        ]
    }
    pub fn hit(&self, x: f64, y: f64) -> usize {
        if self.lines.first().is_some_and(|l| l.height>0.) {
            let y=y-self.view.y+self.scroll_y;
            let line=self.lines.iter().find(|l|y<l.y+l.height).or_else(||self.lines.last()).unwrap();
            let x=x-self.view.x+self.scroll_x;
            return line.glyphs.iter().find(|g|x<g.x+g.width/2.).map_or(line.end,|g|g.start);
        }
        let row = (((y - self.view.y + self.scroll_y) / self.line_height)
            .floor()
            .max(0.) as usize)
            .min(self.lines.len().saturating_sub(1));
        let Some(line) = self.lines.get(row) else {
            return 0;
        };
        let x = x - self.view.x + self.scroll_x;
        line.glyphs
            .iter()
            .find(|g| x < g.x + g.width / 2.)
            .map_or(line.end, |g| g.start)
    }
    pub fn next_blink(&self, now: f64) -> Option<f64> {
        let ms = metrics()["caretBlinkMs"].as_f64().unwrap();
        if ms <= 0. || ms >= u32::MAX as f64 {
            return None;
        }
        Some(self.blink_start + (((now - self.blink_start) / ms).floor() + 1.) * ms)
    }
}
impl Scene {
    pub(super) fn editor_select(
        &mut self,
        id: u32,
        start: usize,
        length: usize,
    ) -> Result<(), String> {
        let n = self.get(id)?;
        if !is_editor(n.kind) {
            return Err("selection requires TextBox/PasswordBox".into());
        }
        let value = EditorState::logical(n.kind, &n.props);
        let start = boundary(value, start.min(units(value)));
        let end = boundary(value, start.saturating_add(length).min(units(value)));
        let changed = (start, end - start) != (n.props.selection_start, n.props.selection_length);
        let n = self.nodes.get_mut(&id).unwrap();
        n.props.selection_start = start;
        n.props.selection_length = end - start;
        n.editor.backward = false;
        n.editor.blink_start = self.time;
        if changed {
            n.editor.manual_scroll=false;
            n.editor.last_type.clear();
            if let Some(doc)=&n.props.document {n.editor.typing_format=doc.format_at(if start>0 && end==start {start-1} else {start});}
        }
        if changed {
            self.emit(id, EventKind::SelectionChanged);
        }
        self.invalidate(id, true);
        Ok(())
    }
    pub(super) fn editor_commit(
        &mut self,
        id: u32,
        mut value: String,
        start: usize,
        length: usize,
        input_type: String,
    ) -> Result<(), String> {
        let n = self.get(id)?;
        if !is_editor(n.kind) {
            return Err("editing requires TextBox/PasswordBox".into());
        }
        if !self.effective_enabled(id) || n.props.is_read_only {
            return Ok(());
        }
        if value.len() > 1_000_000 {
            return Err("editor input exceeds limit".into());
        }
        value = value.replace("\r\n", "\n").replace('\r', "\n");
        if !n.props.accepts_return || n.kind == NodeKind::PasswordBox {
            value = value.replace('\n', "");
        }
        let old = EditorState::logical(n.kind, &n.props).to_string();
        if n.props.max_length > 0 && units(&value) > n.props.max_length {
            // Limit the inserted range, retaining the original suffix after a paste.
            let prefix = old
                .chars()
                .zip(value.chars())
                .take_while(|(a, b)| a == b)
                .map(|(c, _)| c.len_utf8())
                .sum::<usize>();
            let suffix = old[prefix..]
                .chars()
                .rev()
                .zip(value[prefix..].chars().rev())
                .take_while(|(a, b)| a == b)
                .map(|(c, _)| c.len_utf8())
                .sum::<usize>();
            let retained = units(&value[..prefix]) + units(&value[value.len() - suffix..]);
            if retained <= n.props.max_length {
                let end = prefix
                    + byte_at(
                        &value[prefix..value.len() - suffix],
                        n.props.max_length - retained,
                    );
                value = format!("{}{}", &value[..end], &value[value.len() - suffix..]);
            } else {
                value = old.clone();
            }
        }
        let changed = old != value;
        let kind = n.kind;
        let document=if changed && kind==NodeKind::RichEditBox {
            let doc=n.props.document.as_ref().unwrap().edited(&old,&value,n.props.selection_start,n.props.selection_length,&n.editor.typing_format);doc.validate()?;Some(Box::new(doc))
        } else {n.props.document.clone()};
        let n = self.nodes.get_mut(&id).unwrap();
        if changed && matches!(kind, NodeKind::TextBox | NodeKind::RichEditBox) {
            let coalesce = input_type == n.editor.last_type
                && matches!(
                    input_type.as_str(),
                    "insertText" | "deleteContentBackward" | "deleteContentForward"
                )
                && self.time - n.editor.last_edit < 1000.
                && n.props.selection_length == 0;
            if !coalesce {
                if n.editor.undo.len() >= 100 {
                    n.editor.undo.remove(0);
                }
                let editor = &mut *n.editor;
                editor.undo.push(Revision {
                    document: n.props.document.clone(),
                    typing: editor.typing_format.clone(),
                    text: old.clone(),
                    start: n.props.selection_start,
                    length: n.props.selection_length,
                });
            }
            n.editor.redo.clear();
        }
        if kind == NodeKind::PasswordBox {
            n.props.password = value;
        } else {
            n.props.text = value;
        }
        n.props.document=document;
        let typing=n.editor.typing_format.clone();
        n.editor.draft = None;
        n.editor.user_edited = true;
        n.editor.blink_start = self.time;
        self.editor_select(id, start, length)?;
        let n = self.nodes.get_mut(&id).unwrap();
        n.editor.typing_format=typing;
        n.editor.last_type = input_type;
        n.editor.last_edit = self.time;
        if changed {
            self.emit(
                id,
                if kind == NodeKind::PasswordBox {
                    EventKind::PasswordChanged
                } else {
                    EventKind::TextChanged
                },
            );
        }
        self.invalidate(id, true);
        Ok(())
    }
    pub(super) fn editor_history(&mut self, id: u32, redo: bool) -> Result<(), String> {
        let n = self.get(id)?;
        if !matches!(n.kind, NodeKind::TextBox | NodeKind::RichEditBox) || !self.effective_enabled(id) || n.props.is_read_only {
            return Ok(());
        }
        let n = self.nodes.get_mut(&id).unwrap();
        let revision = if redo {
            n.editor.redo.pop()
        } else {
            n.editor.undo.pop()
        };
        if let Some(r) = revision {
            let current = Revision {
                document:n.props.document.clone(),typing:n.editor.typing_format.clone(),
                text: n.props.text.clone(),
                start: n.props.selection_start,
                length: n.props.selection_length,
            };
            if redo {
                n.editor.undo.push(current);
            } else {
                n.editor.redo.push(current);
            }
            n.props.text = r.text;
            n.props.document=r.document;
            n.editor.typing_format=r.typing;
            n.props.selection_start = r.start;
            n.props.selection_length = r.length;
            n.editor.last_type.clear();
            n.editor.draft = None;
            n.editor.blink_start = self.time;
            self.invalidate(id, true);
            self.emit(id, EventKind::TextChanged);
            self.emit(id, EventKind::SelectionChanged);
        }
        Ok(())
    }
    pub(super) fn editor_pointer(
        &mut self,
        id: u32,
        x: f64,
        y: f64,
        extend: bool,
        word: bool,
    ) -> Result<(), String> {
        let n = self.get(id)?;
        let at = n.editor.hit(x, y);
        let value = EditorState::logical(n.kind, &n.props);
        let (start, len) = if word {
            let byte = byte_at(value, at);
            value
                .split_word_bound_indices()
                .find(|(i, s)| *i <= byte && byte < i + s.len())
                .map_or((at, 0), |(i, s)| (units(&value[..i]), units(s)))
        } else if extend {
            let anchor = n.editor.drag_anchor.unwrap_or(n.props.selection_start);
            (anchor.min(at), anchor.abs_diff(at))
        } else {
            (at, 0)
        };
        let backward = extend && at < n.editor.drag_anchor.unwrap_or(n.props.selection_start);
        if !extend {
            self.nodes.get_mut(&id).unwrap().editor.drag_anchor = Some(start);
        }
        self.editor_select(id, start, len)?;
        self.nodes.get_mut(&id).unwrap().editor.backward = backward;
        Ok(())
    }
    pub(super) fn paint_editor(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let p = &n.props;
        let e = &n.editor;
        let focused = self.focused == Some(id) && n.enabled;
        let state = if !n.enabled {
            "Disabled"
        } else if focused {
            "Focused"
        } else if n.button.pointer_inside {
            "PointerOver"
        } else {
            ""
        };
        let combo = n
            .composed
            .owner
            .and_then(|id| self.nodes.get(&id))
            .is_some_and(|owner| owner.kind == NodeKind::ComboBox && (!owner.props.is_editable || !focused));
        let combo_owner = n.composed.owner.and_then(|owner| self.nodes.get(&owner));
        let combo_press = combo
            && self.captured.is_some_and(|(_, target)| {
                target == id
                    || combo_owner.is_some_and(|owner| {
                        owner.composed.parts.get("DropDownButton") == Some(&target)
                    })
            });
        let combo_keyboard_focus =
            combo && focused && !combo_owner.is_some_and(|owner| owner.composed.pointer_focused);
        // CommonStates and FocusStates are independent XAML groups. Keyboard
        // focus changes foreground/highlight, never suppresses hover chrome.
        let combo_state = combo_owner.filter(|owner| owner.kind == NodeKind::ComboBox).map_or("", |owner| match self.combo_common_state(owner.id) {
            ControlState::Normal => "", ControlState::PointerOver => "PointerOver", ControlState::Pressed => "Pressed", ControlState::Disabled => "Disabled"
        });
        let color = |part: &str| {
            let key = if combo {
                format!(
                    "ComboBox{}{}",
                    if part == "PlaceholderForeground" {
                        "PlaceHolderForeground"
                    } else {
                        part
                    },
                    if combo_keyboard_focus && part.contains("Foreground") {
                        if combo_press { "FocusedPressed" } else { "Focused" }
                    } else { combo_state }
                )
            } else {
                format!("TextControl{part}{state}")
            };
            crate::resources::Resources::current()
                .resolve(n.theme, &key)
                .unwrap_or_else(|_| resource(n.theme, &format!("TextControl{part}{state}")))
                .solid_color()
        };
        let hh = self.input_header_height(id);
        self.paint_input_header(id, out);
        let combo_editor = combo_owner.is_some_and(|owner| owner.kind == NodeKind::ComboBox);
        let stroke = if combo_editor { overlays::border_thickness([1.;4],self.dpr)[0] } else { 1. };
        let r = Rect::new(
            stroke / 2.,
            hh + stroke / 2.,
            (n.rect.width - stroke).max(0.),
            (n.rect.height - hh - stroke).max(0.),
        );
        if combo && combo_keyboard_focus {
            // The native highlight sits behind the faceplate, with a -4 DIP
            // margin. Keep its fill and accent pill; the project disables focus rings.
            out.push(Draw::Fill {
                rect: Rect::new(-4., hh - 4., n.rect.width + 8., n.rect.height - hh + 8.),
                radius: 8.,
                color: resource(n.theme, "ComboBoxBackgroundFocused").solid_color(),
            });
        }
        // EditableText overlays the still-visible ComboBox Background border.
        // Its translucent focused fill must sample that faceplate, not the page.
        if combo_editor && !combo {
            out.push(Draw::Fill {
                rect: Rect::new(stroke, hh + stroke, (n.rect.width - 2. * stroke).max(0.), (n.rect.height - hh - 2. * stroke).max(0.)),
                radius: (p.corner_radius - stroke).max(0.),
                color: resource(n.theme, &format!("ComboBoxBackground{combo_state}")).solid_color(),
            });
            Self::brush_command(out, r, (p.corner_radius - stroke / 2.).max(0.), stroke,
                resource(n.theme, &format!("ComboBoxBorderBrush{combo_state}")));
        }
        out.push(Draw::VectorLayer {
            bounds: Rect::new(0., hh, n.rect.width, n.rect.height - hh),
        });
        let brush = if combo {
            crate::resources::Resources::current()
                .resolve(n.theme, &format!("ComboBoxBorderBrush{combo_state}"))
                .unwrap_or_else(|_| resource(n.theme, "ComboBoxBorderBrush"))
        } else {
            resource(n.theme, &format!("TextControlBorderBrush{state}"))
        };
        let joined = self.composed_corner_radii(id);
        for half in 0..if joined.is_some() { 2 } else { 1 } {
            let radius = joined.map_or(p.corner_radius, |r| r[if half == 0 { 0 } else { 3 }]);
            if joined.is_some() {
                out.push(Draw::Clip {
                    rect: Rect::new(
                        0.,
                        hh + (n.rect.height - hh) / 2. * half as f64,
                        n.rect.width,
                        (n.rect.height - hh) / 2.,
                    ),
                });
            }
            out.push(Draw::Fill {
                rect: if combo_editor { Rect::new(stroke, hh + stroke, (n.rect.width-2.*stroke).max(0.), (n.rect.height-hh-2.*stroke).max(0.)) } else { r },
                radius: (radius - if combo_editor {stroke} else {0.5}).max(0.),
                color: p
                    .background
                    .as_ref()
                    .map_or_else(|| color("Background"), |b| Self::color(b, n.theme)),
            });
            Self::brush_command(out, r, (radius - stroke / 2.).max(0.), stroke, brush);
            if joined.is_some() {
                out.push(Draw::Restore);
            }
        }
        if focused && !combo {
            let body = Rect::new(0., hh, n.rect.width, n.rect.height - hh);
            let accent = if brush.kind == "solid" {
                brush.solid_color()
            } else {
                crate::material::css(
                    brush.gradient_sample(body, [0.5, 1. - 1. / body.height.max(1.)]),
                )
            };
            out.push(Draw::CornerClip {
                rect: body,
                radii: joined.unwrap_or([p.corner_radius; 4]).map(|v| [v, v]),
            });
            // A separate asymmetric bottom edge keeps its 2 DIP coverage at
            // every height/DPR, independent of coincident gradient-stop precision.
            out.push(Draw::Fill {
                rect: Rect::new(
                    0.,
                    n.rect.height - (2. * self.dpr).round() / self.dpr,
                    n.rect.width,
                    (2. * self.dpr).round() / self.dpr,
                ),
                radius: 0.,
                color: accent,
            });
            out.push(Draw::Restore);
        }
        out.push(Draw::EndLayer);
        if combo && combo_keyboard_focus {
            out.push(Draw::Fill {
                rect: Rect::new(1., hh + (n.rect.height - hh - 16.) / 2., 3., 16.),
                radius: 1.5,
                color: crate::resources::Resources::current()
                    .color(n.theme, "AccentFillColorDefaultBrush")
                    .into(),
            });
        }
        out.push(Draw::Clip { rect: e.view });
        let foreground = p
            .foreground
            .as_ref()
            .map_or_else(|| color("Foreground"), |b| Self::color(b, n.theme));
        let (ss, sl) = if e.draft.is_some() {
            e.draft_selection
        } else {
            (p.selection_start, p.selection_length)
        };
        let selected = ss..ss + sl;
        let highlight = p.selection_highlight_color.clone().unwrap_or_else(|| {
            resource(n.theme, "TextControlSelectionHighlightColor").solid_color()
        });
        if n.kind == NodeKind::RichEditBox {self.paint_rich_editor(id,out,&foreground,&highlight,ss,sl,focused);} else {
        for (row, line) in e.lines.iter().enumerate() {
            if focused && sl > 0 {
                for g in &line.glyphs {
                    if g.end > selected.start && g.start < selected.end {
                        out.push(Draw::Fill {
                            rect: Rect::new(
                                e.view.x + g.x - e.scroll_x,
                                e.view.y + row as f64 * e.line_height - e.scroll_y,
                                g.width + (p.character_spacing * p.font_size / 1000.).max(0.),
                                e.line_height,
                            ),
                            radius: 0.,
                            color: highlight.clone(),
                        });
                    }
                }
            }
            if p.character_spacing == 0. {
                out.push(Draw::Text {
                    style: p.font_style,
                    x: e.view.x - e.scroll_x,
                    y: e.view.y + line.baseline - e.scroll_y,
                    text: line.text.clone(),
                    color: foreground.clone(),
                    size: p.font_size,
                    font: p.font_family.clone(),
                    max_width: line.width.max(1.) + 1.,
                    weight: p.font_weight,
                });
            } else {
                for g in &line.glyphs {
                    out.push(Draw::Text {
                        style: p.font_style,
                        x: e.view.x + g.x - e.scroll_x,
                        y: e.view.y + line.baseline - e.scroll_y,
                        text: g.text.clone(),
                        color: foreground.clone(),
                        size: p.font_size,
                        font: p.font_family.clone(),
                        max_width: g.width.max(1.) + 1.,
                        weight: p.font_weight,
                    });
                }
            }
        }
        }
        let value = e
            .draft
            .as_deref()
            .unwrap_or_else(|| EditorState::logical(n.kind, p));
        if value.is_empty() {
            for l in &e.placeholder.lines {
                out.push(Draw::Text {
                    style: p.font_style,
                    x: e.view.x,
                    y: e.view.y + l.baseline,
                    text: l.text.clone(),
                    color: color("PlaceholderForeground"),
                    size: p.font_size,
                    font: p.font_family.clone(),
                    max_width: e.view.width,
                    weight: p.font_weight,
                });
            }
        }
        let blink = metrics()["caretBlinkMs"].as_f64().unwrap();
        if focused
            && !p.is_read_only
            && sl == 0
            && (blink <= 0.
                || blink >= u32::MAX as f64
                || (((self.time - e.blink_start) / blink) as u64).is_multiple_of(2))
        {
            out.push(Draw::Fill {
                rect: e.caret,
                radius: 0.,
                color: foreground,
            });
        }
        out.push(Draw::Restore);
        if n.kind == NodeKind::RichEditBox {
            out.push(Draw::Save);
            out.push(Draw::Transform { matrix: [1., 0., 0., 1., e.view.x, e.view.y] });
            n.scroll.paint(&n.props, n.scroll.viewport, n.theme, self.reduced_transparency, n.enabled, self.time, out);
            out.push(Draw::Restore);
        }
        if e.helper(n.kind, p, focused) {
            let suffix = if e.helper_pressed {
                "Pressed"
            } else if e.helper_hover {
                "PointerOver"
            } else {
                ""
            };
            if e.helper_hover || e.helper_pressed {
                out.push(Draw::Fill {
                    rect: e.helper_mask,
                    radius: (p.corner_radius - 1.).max(0.),
                    color: resource(n.theme, &format!("TextControlButtonBackground{suffix}"))
                        .solid_color(),
                });
            }
            out.push(Draw::Text {
                style: FontStyle::Normal,
                x: e.helper_glyph[0],
                y: e.helper_glyph[1],
                text: if n.kind == NodeKind::PasswordBox {
                    "\u{f78d}"
                } else {
                    "\u{e894}"
                }
                .into(),
                color: resource(n.theme, &format!("TextControlButtonForeground{suffix}"))
                    .solid_color(),
                size: 12.,
                font: "Segoe Fluent Icons".into(),
                max_width: 16.,
                weight: 400,
            });
        }
    }
}
