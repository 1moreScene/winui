//! Rich text flow, selection and inline lifetime. UTF-16 positions are logical;
//! display order is resolved in Rust using the Unicode bidi algorithm.
use super::*;
use unicode_bidi::{BidiInfo, Level};

fn utf16_slice(text: &str, start: usize, end: usize) -> String {
    text.encode_utf16()
        .skip(start)
        .take(end.saturating_sub(start))
        .collect::<Vec<_>>()
        .as_slice()
        .pipe_string()
}
trait Utf16String {
    fn pipe_string(&self) -> String;
}
impl Utf16String for [u16] {
    fn pipe_string(&self) -> String {
        String::from_utf16_lossy(self)
    }
}
fn same_font(a: &Fragment, b: &Fragment) -> bool {
    a.font.family == b.font.family
        && a.font.size == b.font.size
        && a.font.weight == b.font.weight
        && a.font.style == b.font.style
        && a.rtl == b.rtl
        && a.link == b.link
        && serde_json::to_string(&a.color).ok() == serde_json::to_string(&b.color).ok()
        && a.underline == b.underline
        && a.strike == b.strike
}
impl Scene {
    pub(in crate::scene) fn rich_pointer_presentation(&self, id: u32) -> Option<(&'static str, &'static str)> {
        let n = &self.nodes[&id];
        if !matches!(n.kind, NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow) {
            return None;
        }
        let selectable = props(&self.nodes[&self.rich_owner(id)].props).is_text_selection_enabled;
        let link = self.pointer.and_then(|(x, y)| n.world.inverse().map(|m| m.point(x, y)))
            .is_some_and(|(x, y)| n.reading.fragments.iter().any(|f| f.link.is_some() && f.rect.contains(x, y)));
        Some((if link { "pointer" } else if selectable { "text" } else { "default" },
            if selectable { "text" } else { "none" }))
    }
    pub(in crate::scene) fn finish_rich_flow(&mut self, m: &mut impl TextMeasurer) {
        let roots = self
            .nodes
            .values()
            .filter(|n| {
                n.kind == NodeKind::RichTextBlock
                    && props(&n.props).overflow_content_target.is_some()
            })
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for root in roots {
            self.nodes.get_mut(&root).unwrap().reading.rich_start = 0;
            let mut at = Some(root);
            while let Some(id) = at {
                let n = &self.nodes[&id];
                let p = n.props.padding;
                let r = Rect::new(
                    p[0],
                    p[1],
                    (n.rect.width - p[0] - p[2]).max(0.),
                    (n.rect.height - p[1] - p[3]).max(0.),
                );
                at = props(&n.props).overflow_content_target;
                self.arrange_rich(id, r, m);
            }
        }
        // Detached or overflowing inline slots stay alive for later reflow, but
        // must not paint, hit-test or project stale accessible descendants.
        let hidden = self
            .nodes
            .values()
            .filter(|n| {
                n.parent.is_some_and(|parent| {
                    matches!(
                        self.nodes[&parent].kind,
                        NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
                    ) && !self.nodes[&parent]
                        .reading
                        .fragments
                        .iter()
                        .any(|f| f.inline == Some(n.id))
                })
            })
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in hidden {
            let parent = self.nodes[&id].parent.unwrap();
            let n = &self.nodes[&parent];
            let world = n.world;
            let flags = (n.theme, n.enabled, false);
            self.arrange_node(id, Rect::default(), world, flags, m);
        }
    }
    pub(super) fn rich_owner(&self, id: u32) -> u32 {
        self.nodes[&id]
            .reading
            .rich_source
            .filter(|r| self.nodes.contains_key(r))
            .unwrap_or(id)
    }
    pub(super) fn layout_rich(
        &mut self,
        id: u32,
        width: f64,
        height: f64,
        m: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let owner = self.rich_owner(id);
        let p = self.nodes[&owner].props.clone();
        let q = props(&p);
        let start = self.nodes[&id].reading.rich_start;
        let mut paragraphs = q.paragraphs.clone();
        if paragraphs.is_empty() {
            paragraphs.push(Paragraph {
                runs: vec![RichRun {
                    text: p.text.clone(),
                    ..Default::default()
                }],
                ..Default::default()
            });
        }
        let mut text = String::new();
        for (i, par) in paragraphs.iter().enumerate() {
            if i > 0 {
                text.push('\n')
            }
            for run in &par.runs {
                if run.inline.is_some() {
                    text.push('\u{fffc}')
                } else {
                    text.push_str(&run.text)
                }
            }
        }
        let total = text.encode_utf16().count();
        self.nodes.get_mut(&owner).unwrap().reading.rich_text = text.clone();
        let selection = self.nodes[&owner].reading.rich_selection;
        if selection.0 > total || selection.1 > total {
            self.rich_selection(owner, selection.0.min(total), selection.1.min(total));
        }
        let mut result = vec![];
        let mut y = 0_f64;
        let mut extent = 0_f64;
        let mut offset = 0;
        let mut consumed = start;
        let mut exhausted = false;
        for (pi, par) in paragraphs.iter().enumerate() {
            if pi > 0 {
                offset += 1;
            }
            let par_start = offset;
            let mut logical = String::new();
            for run in &par.runs {
                logical.push_str(if run.inline.is_some() {
                    "\u{fffc}"
                } else {
                    &run.text
                });
            }
            let base = if self.effective_flow_direction(owner) == FlowDirection::RightToLeft {
                Some(Level::rtl())
            } else {
                None
            };
            let bidi = BidiInfo::new(&logical, base);
            let mut bytes = 0;
            let mut line: Vec<(Fragment, f64, f64, Level)> = vec![];
            let mut x = 0.;
            let mut first_line = true;
            let left = par.margin[0];
            let limit = (width - left - par.margin[2]).max(0.);
            let finish = |line: &mut Vec<(Fragment, f64, f64, Level)>,
                          y: &mut f64,
                          result: &mut Vec<Fragment>,
                          consumed: &mut usize,
                          extent: &mut f64,
                          last: bool|
             -> bool {
                if line.is_empty() {
                    return true;
                }
                let asc = line.iter().map(|f| f.1).fold(0., f64::max);
                let desc = line.iter().map(|f| f.2).fold(0., f64::max);
                let h = p.line_height.unwrap_or(asc + desc).max(asc + desc);
                if *y + h > height + 1e-7 {
                    return false;
                }
                let used = line.iter().map(|f| f.0.rect.width).sum::<f64>();
                let free = if limit.is_finite() {
                    (limit - used).max(0.)
                } else {
                    0.
                };
                let spaces = line
                    .iter()
                    .filter(|f| f.0.text.chars().all(char::is_whitespace))
                    .count();
                let justify = q.text_alignment == TextAlignment::Justify && !last && spaces > 0;
                let mut at = left
                    + match q.text_alignment {
                        TextAlignment::Center => free / 2.,
                        TextAlignment::Right => free,
                        TextAlignment::DetectFromContent
                            if bidi.paragraphs.first().is_some_and(|p| p.level.is_rtl()) =>
                        {
                            free
                        }
                        _ => 0.,
                    };
                let order = BidiInfo::reorder_visual(&line.iter().map(|f| f.3).collect::<Vec<_>>());
                for i in order {
                    let mut f = line[i].0.clone();
                    f.rtl = line[i].3.is_rtl();
                    f.rect.x = at;
                    f.rect.y = *y;
                    f.rect.height = h;
                    f.baseline = *y + asc + (h - asc - desc) / 2.;
                    if justify && f.text.chars().all(char::is_whitespace) {
                        f.rect.width += free / spaces as f64;
                    }
                    at += f.rect.width;
                    *consumed = (*consumed).max(f.end);
                    result.push(f);
                }
                *extent = extent.max(at + par.margin[2]);
                *y += h;
                line.clear();
                true
            };
            for run in &par.runs {
                let mut font = p.font();
                if let Some(v) = run.font_size {
                    font.size = v;
                }
                if let Some(v) = run.font_weight {
                    font.weight = v;
                }
                if let Some(v) = run.font_style {
                    font.style = v;
                }
                if let Some(key) = &run.inline {
                    let child = self.nodes[&owner]
                        .reading
                        .inline_nodes
                        .get(key)
                        .copied()
                        .filter(|c| self.nodes.contains_key(c))
                        .or_else(|| {
                            self.nodes
                                .values()
                                .find(|n| {
                                    n.props.layout_key == *key
                                        && n.parent.is_some_and(|parent| {
                                            parent == owner || self.rich_owner(parent) == owner
                                        })
                                })
                                .map(|n| n.id)
                        });
                    let d = child
                        .map(|c| {
                            self.nodes
                                .get_mut(&owner)
                                .unwrap()
                                .reading
                                .inline_nodes
                                .insert(key.clone(), c);
                            self.measure_node(c, [limit, f64::INFINITY], m)
                        })
                        .unwrap_or([0.; 2]);
                    if offset >= start {
                        if first_line {
                            y += par.margin[1];
                            first_line = false;
                        }
                        if x > 0. && x + d[0] > limit && p.wrap {
                            if !finish(
                                &mut line,
                                &mut y,
                                &mut result,
                                &mut consumed,
                                &mut extent,
                                false,
                            ) {
                                exhausted = true;
                                break;
                            }
                            x = 0.;
                        }
                        line.push((
                            Fragment {
                                text: "\u{fffc}".into(),
                                font: font.clone(),
                                color: None,
                                underline: false,
                                strike: false,
                                link: None,
                                rect: Rect::new(0., 0., d[0], 0.),
                                baseline: 0.,
                                start: offset,
                                end: offset + 1,
                                rtl: false,
                                inline: child,
                            },
                            d[1],
                            0.,
                            bidi.levels.get(bytes).copied().unwrap_or(Level::ltr()),
                        ));
                        x += d[0];
                    }
                    offset += 1;
                    bytes += "\u{fffc}".len();
                    continue;
                }
                for word in run.text.split_word_bounds() {
                    let w = m.measure(word, &font).width;
                    if offset + word.encode_utf16().count() <= start {
                        offset += word.encode_utf16().count();
                        bytes += word.len();
                        continue;
                    }
                    if first_line {
                        y += par.margin[1];
                        first_line = false;
                    }
                    if p.wrap && x > 0. && x + w > limit + 1e-7 {
                        if !finish(
                            &mut line,
                            &mut y,
                            &mut result,
                            &mut consumed,
                            &mut extent,
                            false,
                        ) {
                            exhausted = true;
                            break;
                        }
                        x = 0.;
                    }
                    let mut prefix = String::new();
                    let mut previous = 0.;
                    for g in word.graphemes(true) {
                        let count = g.encode_utf16().count();
                        let level = bidi.levels.get(bytes).copied().unwrap_or(Level::ltr());
                        let begin = offset;
                        offset += count;
                        bytes += g.len();
                        if offset <= start {
                            continue;
                        }
                        if g == "\r" {
                            continue;
                        }
                        if g.contains('\n') {
                            if !finish(
                                &mut line,
                                &mut y,
                                &mut result,
                                &mut consumed,
                                &mut extent,
                                true,
                            ) {
                                exhausted = true;
                                break;
                            }
                            consumed = offset;
                            x = 0.;
                            continue;
                        }
                        prefix.push_str(g);
                        let met = m.measure(&prefix, &font);
                        let gw = (met.width - previous).max(0.);
                        previous = met.width;
                        if p.wrap && x > 0. && x + gw > limit + 1e-7 {
                            if !finish(
                                &mut line,
                                &mut y,
                                &mut result,
                                &mut consumed,
                                &mut extent,
                                false,
                            ) {
                                exhausted = true;
                                break;
                            }
                            x = 0.;
                        }
                        line.push((
                            Fragment {
                                text: g.into(),
                                font: font.clone(),
                                color: run.foreground.clone(),
                                underline: run.underline || run.link.is_some(),
                                strike: run.strikethrough,
                                link: run.link.clone(),
                                rect: Rect::new(0., 0., gw, 0.),
                                baseline: 0.,
                                start: begin,
                                end: offset,
                                rtl: false,
                                inline: None,
                            },
                            met.ascent,
                            met.descent,
                            level,
                        ));
                        x += gw;
                    }
                    if exhausted {
                        break;
                    }
                }
                if exhausted {
                    break;
                }
            }
            if exhausted {
                break;
            }
            if line.is_empty() && offset == par_start && offset >= start {
                let met = m.measure("Mg", &p.font());
                if y + met.ascent + met.descent <= height {
                    y += met.ascent + met.descent;
                }
            }
            if !finish(
                &mut line,
                &mut y,
                &mut result,
                &mut consumed,
                &mut extent,
                true,
            ) {
                exhausted = true;
                break;
            }
            if offset >= start {
                y += par.margin[3];
            }
            consumed = consumed.max(offset);
        }
        let end = if exhausted { consumed } else { total };
        let n = self.nodes.get_mut(&id).unwrap();
        n.reading.fragments = result;
        n.reading.rich_end = end;
        n.reading.rich_text = text;
        if height.is_finite() {
            if let Some(target) = props(&n.props)
                .overflow_content_target
                .filter(|t| self.nodes.contains_key(t))
            {
                let target = self.nodes.get_mut(&target).unwrap();
                target.reading.rich_source = Some(owner);
                target.reading.rich_start = end;
            }
        }
        [
            (extent * self.dpr - 1e-7).ceil() / self.dpr,
            (y * self.dpr - 1e-7).ceil() / self.dpr,
        ]
    }
    pub(super) fn arrange_rich(&mut self, id: u32, inner: Rect, m: &mut impl TextMeasurer) {
        self.layout_rich(id, inner.width, inner.height, m);
        let owner = self.rich_owner(id);
        let selection = self.nodes[&owner].reading.rich_selection;
        let n = self.nodes.get_mut(&id).unwrap();
        n.reading.rich_selection = selection;
        for f in &mut n.reading.fragments {
            f.rect.x += inner.x;
            f.rect.y += inner.y;
            f.baseline += inner.y;
        }
        let inlines = n
            .reading
            .fragments
            .iter()
            .filter_map(|f| f.inline.map(|c| (c, f.rect, f.baseline)))
            .collect::<Vec<_>>();
        let world = n.world;
        let flags = (n.theme, n.enabled, n.visible);
        for (child, r, baseline) in inlines {
            let h = self.nodes[&child].desired[1];
            if self.nodes[&child].parent != Some(id) {
                let _ = self.reparent(child, id, None);
            }
            self.arrange_node(
                child,
                Rect::new(r.x, baseline - h, r.width, h),
                world,
                flags,
                m,
            );
        }
    }
    fn rich_selection(&mut self, id: u32, anchor: usize, focus: usize) {
        let owner = self.rich_owner(id);
        let text = self.nodes[&owner].reading.rich_text.clone();
        let mut boundaries = vec![0];
        let mut offset = 0;
        for g in text.graphemes(true) {
            offset += g.encode_utf16().count();
            boundaries.push(offset)
        }
        let snap = |v: usize| {
            boundaries
                .iter()
                .copied()
                .take_while(|b| *b <= v)
                .last()
                .unwrap_or(0)
        };
        let range = (snap(anchor.min(offset)), snap(focus.min(offset)));
        if self.nodes[&owner].reading.rich_selection != range {
            self.nodes.get_mut(&owner).unwrap().reading.rich_selection = range;
            self.emit(owner, EventKind::TextSelectionChanged);
            let e = self.events.last_mut().unwrap();
            e.selection_start = Some(range.0.min(range.1));
            e.selection_length = Some(range.0.abs_diff(range.1));
            e.text = Some(utf16_slice(
                &text,
                range.0.min(range.1),
                range.0.max(range.1),
            ));
            self.invalidate(self.root, true);
        }
    }
    fn rich_hit(&self, id: u32, x: f64, y: f64) -> usize {
        let n = &self.nodes[&id];
        let point = n.world.inverse().unwrap_or_default().point(x, y);
        n.reading
            .fragments
            .iter()
            .min_by(|a, b| {
                let distance = |f: &Fragment| {
                    let dy = if point.1 < f.rect.y {
                        f.rect.y - point.1
                    } else if point.1 > f.rect.y + f.rect.height {
                        point.1 - f.rect.y - f.rect.height
                    } else {
                        0.
                    };
                    dy * 10000. + (point.0 - (f.rect.x + f.rect.width / 2.)).abs()
                };
                distance(a).total_cmp(&distance(b))
            })
            .map(|f| {
                if (point.0 > f.rect.x + f.rect.width / 2.) != f.rtl {
                    f.end
                } else {
                    f.start
                }
            })
            .unwrap_or(n.reading.rich_start)
    }
    pub(super) fn rich_input(&mut self, input: &Input) -> Result<bool, String> {
        if let Input::RichPointerSelection {
            id,
            x,
            y,
            paragraph,
        } = input
        {
            let resolved = if *id == 0 {
                match self.hit(*x, *y) {
                    Some(hit)
                        if matches!(
                            self.nodes[&hit].kind,
                            NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
                        ) =>
                    {
                        hit
                    }
                    _ => return Ok(true),
                }
            } else {
                *id
            };
            let id = &resolved;
            if !matches!(
                self.get(*id)?.kind,
                NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
            ) {
                return Err("Selection requires rich text".into());
            }
            let owner = self.rich_owner(*id);
            if !props(&self.nodes[&owner].props).is_text_selection_enabled
                || !self.effective_enabled(*id)
            {
                return Ok(true);
            }
            let index = self.rich_hit(*id, *x, *y);
            let text = self.nodes[&owner].reading.rich_text.clone();
            let mut offset = 0;
            let chunks = if *paragraph {
                text.split_inclusive('\n').collect::<Vec<_>>()
            } else {
                text.split_word_bounds().collect::<Vec<_>>()
            };
            for word in chunks {
                let end = offset + word.encode_utf16().count();
                if index < end {
                    self.rich_selection(*id, offset, end);
                    break;
                }
                offset = end;
            }
            return Ok(true);
        }
        if let Input::RichSelect { id, start, length } = input {
            if !matches!(
                self.get(*id)?.kind,
                NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
            ) {
                return Err("select requires rich text".into());
            }
            self.rich_selection(*id, *start, start.saturating_add(*length));
            return Ok(true);
        }
        if let Input::KeyDown { key, .. } = input {
            if let Some(id) = self.focused.filter(|i| {
                matches!(
                    self.nodes[i].kind,
                    NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
                )
            }) {
                let owner = self.rich_owner(id);
                let q = props(&self.nodes[&owner].props);
                if !q.is_text_selection_enabled {
                    return Ok(false);
                }
                let text = self.nodes[&owner].reading.rich_text.clone();
                let (a, b) = self.nodes[&owner].reading.rich_selection;
                let total = text.encode_utf16().count();
                if matches!(key.as_str(), "Ctrl+c" | "Ctrl+C" | "Ctrl+Insert") {
                    self.emit(owner, EventKind::CopyRequested);
                    self.events.last_mut().unwrap().text =
                        Some(utf16_slice(&text, a.min(b), a.max(b)));
                    return Ok(true);
                }
                if matches!(key.as_str(), "Ctrl+a" | "Ctrl+A") {
                    self.rich_selection(id, 0, total);
                    return Ok(true);
                }
                let base = key.rsplit('+').next().unwrap_or(key);
                let shift = key.contains("Shift+");
                let ctrl = key.contains("Ctrl+");
                if [
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowDown",
                    "Home",
                    "End",
                ]
                .contains(&base)
                {
                    let fragments = self
                        .nodes
                        .values()
                        .filter(|n| {
                            matches!(
                                n.kind,
                                NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
                            ) && self.rich_owner(n.id) == owner
                        })
                        .flat_map(|n| n.reading.fragments.iter().map(move |f| (n.id, f)))
                        .collect::<Vec<_>>();
                    let current = fragments
                        .iter()
                        .find(|(_, f)| f.start == b)
                        .or_else(|| fragments.iter().find(|(_, f)| f.start < b && b <= f.end));
                    let mut next = match base {
                        "Home" => 0,
                        "End" => total,
                        "ArrowLeft" => text
                            .graphemes(true)
                            .scan(0, |o, g| {
                                *o += g.encode_utf16().count();
                                Some(*o)
                            })
                            .take_while(|o| *o < b)
                            .last()
                            .unwrap_or(0),
                        _ => text
                            .graphemes(true)
                            .scan(0, |o, g| {
                                *o += g.encode_utf16().count();
                                Some(*o)
                            })
                            .find(|o| *o > b)
                            .unwrap_or(total),
                    };
                    if !shift && a != b && matches!(base, "ArrowLeft" | "ArrowRight") {
                        next = if base == "ArrowLeft" {
                            a.min(b)
                        } else {
                            a.max(b)
                        }
                    } else if ctrl && matches!(base, "ArrowLeft" | "ArrowRight") {
                        let mut offset = 0;
                        let starts = text
                            .split_word_bounds()
                            .filter_map(|word| {
                                let start = offset;
                                offset += word.encode_utf16().count();
                                word.chars().any(char::is_alphanumeric).then_some(start)
                            })
                            .collect::<Vec<_>>();
                        next = if base == "ArrowLeft" {
                            starts
                                .into_iter()
                                .take_while(|v| *v < b)
                                .last()
                                .unwrap_or(0)
                        } else {
                            starts.into_iter().find(|v| *v > b).unwrap_or(total)
                        }
                    } else if let Some((container, f)) = current {
                        if !ctrl && matches!(base, "Home" | "End") {
                            let line = fragments.iter().filter(|(id, v)| {
                                id == container && (v.rect.y - f.rect.y).abs() < 0.01
                            });
                            next = if base == "Home" {
                                line.map(|(_, v)| v.start).min().unwrap_or(b)
                            } else {
                                line.map(|(_, v)| v.end).max().unwrap_or(b)
                            }
                        }
                        if matches!(base, "ArrowUp" | "ArrowDown") {
                            let down = base == "ArrowDown";
                            let x = f.rect.x + if b == f.end { f.rect.width } else { 0. };
                            let mut lines = fragments
                                .iter()
                                .filter(|(_, v)| {
                                    if down {
                                        v.start > f.start
                                    } else {
                                        v.end <= f.start
                                    }
                                })
                                .filter(|(id, v)| {
                                    id != container || (v.rect.y - f.rect.y).abs() > 0.01
                                })
                                .collect::<Vec<_>>();
                            lines.sort_by_key(|(_, v)| v.start);
                            let adjacent = if down { lines.first() } else { lines.last() };
                            if let Some((target, g)) = adjacent {
                                let line = fragments.iter().filter(|(id, v)| {
                                    id == target && (v.rect.y - g.rect.y).abs() < 0.01
                                });
                                if let Some((_, v)) = line.min_by(|(_, a), (_, b)| {
                                    (a.rect.x + a.rect.width / 2. - x)
                                        .abs()
                                        .total_cmp(&(b.rect.x + b.rect.width / 2. - x).abs())
                                }) {
                                    next = if x > v.rect.x + v.rect.width / 2. {
                                        v.end
                                    } else {
                                        v.start
                                    }
                                }
                            } else {
                                next = if down { total } else { 0 }
                            }
                        }
                    }
                    self.rich_selection(id, if shift { a } else { next }, next);
                    return Ok(true);
                }
            }
        }
        if let Input::Down { x, y, pointer }
        | Input::Move { x, y, pointer }
        | Input::Up { x, y, pointer } = input
        {
            let drag = self
                .nodes
                .values()
                .find(|n| n.reading.rich_drag.is_some_and(|d| d.0 == *pointer))
                .map(|n| n.id);
            let under = self.hit(*x, *y);
            let hit = under
                .filter(|i| {
                    matches!(
                        self.nodes[i].kind,
                        NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
                    ) && drag.is_none_or(|d| self.rich_owner(d) == self.rich_owner(*i))
                })
                .or(drag);
            if let Some(id) = hit.filter(|i| {
                matches!(
                    self.nodes[i].kind,
                    NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
                )
            }) {
                let owner = self.rich_owner(id);
                if !self.effective_enabled(id) {
                    return Ok(false);
                }
                let index = self.rich_hit(id, *x, *y);
                let n = &self.nodes[&id];
                let point = n.world.inverse().unwrap_or_default().point(*x, *y);
                let link = n
                    .reading
                    .fragments
                    .iter()
                    .find(|f| f.rect.contains(point.0, point.1))
                    .and_then(|f| f.link.clone());
                if matches!(input, Input::Down { .. }) {
                    self.focus(Some(id));
                    self.nodes.get_mut(&id).unwrap().reading.pressed_link =
                        link.clone().map(|l| (*pointer, l));
                    if props(&self.nodes[&owner].props).is_text_selection_enabled {
                        self.nodes.get_mut(&id).unwrap().reading.rich_drag =
                            Some((*pointer, index));
                        self.captured = Some((*pointer, id));
                        self.rich_selection(id, index, index);
                    }
                }
                if matches!(input, Input::Move { .. }) {
                    if let Some((_, anchor)) = drag.and_then(|d| self.nodes[&d].reading.rich_drag) {
                        self.rich_selection(id, anchor, index);
                    }
                }
                if matches!(input, Input::Up { .. }) {
                    let dragged = drag.unwrap_or(id);
                    let down = self
                        .nodes
                        .get_mut(&dragged)
                        .unwrap()
                        .reading
                        .pressed_link
                        .take();
                    let range = self.nodes[&owner].reading.rich_selection;
                    self.nodes.get_mut(&dragged).unwrap().reading.rich_drag = None;
                    self.captured = None;
                    if range.0 == range.1 {
                        if let Some((p, l)) = down {
                            if p == *pointer && Some(&l) == link.as_ref() {
                                self.emit(owner, EventKind::HyperlinkClick);
                                self.events.last_mut().unwrap().text = Some(l);
                            }
                        }
                    }
                }
                return Ok(true);
            }
        }
        if matches!(input, Input::Cancel { .. } | Input::Blur) {
            for n in self.nodes.values_mut() {
                n.reading.rich_drag = None;
                n.reading.pressed_link = None;
            }
        }
        Ok(false)
    }
    pub(super) fn paint_rich(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let owner = self.rich_owner(id);
        let p = &self.nodes[&owner].props;
        let q = props(p);
        let (a, b) = self.nodes[&owner].reading.rich_selection;
        let range = if self.focused.is_some_and(|id| {
            matches!(
                self.nodes[&id].kind,
                NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
            ) && self.rich_owner(id) == owner
        }) {
            a.min(b)..a.max(b)
        } else {
            0..0
        };
        let selected = |f: &Fragment| f.start < range.end && f.end > range.start;
        let highlighter = |f: &Fragment| {
            q.text_highlighters.iter().rev().find(|h| {
                h.ranges.iter().any(|r| {
                    r.start_index < f.end && r.start_index.saturating_add(r.length) > f.start
                })
            })
        };
        let foreground = p
            .foreground
            .as_ref()
            .map(|b| Self::color(b, n.theme))
            .unwrap_or_else(|| color(n.theme, "TextFillColorPrimaryBrush"));
        let effective = |f: &Fragment| {
            if selected(f) {
                if n.theme == Theme::HighContrast {
                    "#000000"
                } else {
                    "#ffffff"
                }
                .into()
            } else if let Some(h) = highlighter(f) {
                h.foreground
                    .as_ref()
                    .map(|b| Self::color(b, n.theme))
                    .unwrap_or_else(|| color(n.theme, "TextControlHighlighterForeground"))
            } else {
                f.color
                    .as_ref()
                    .map(|b| Self::color(b, n.theme))
                    .unwrap_or_else(|| {
                        if f.link.is_some() {
                            color(n.theme, "AccentTextFillColorPrimaryBrush")
                        } else {
                            foreground.clone()
                        }
                    })
            }
        };
        // Native TextHighlightMerge lets the last range win; selection overrides
        // the range instead of blending two translucent highlight backgrounds.
        let mut backgrounds: Vec<(Rect, String)> = vec![];
        for f in &n.reading.fragments {
            let bg = if selected(f) {
                Some(
                    p.selection_highlight_color
                        .clone()
                        .unwrap_or_else(|| color(n.theme, "AccentFillColorDefaultBrush")),
                )
            } else {
                highlighter(f).map(|h| {
                    h.background
                        .as_ref()
                        .map(|b| Self::color(b, n.theme))
                        .unwrap_or_else(|| color(n.theme, "TextControlHighlighterBackground"))
                })
            };
            if let Some(color) = bg {
                if let Some((rect, previous)) = backgrounds.last_mut().filter(|(r, c)| {
                    *c == color
                        && (r.y - f.rect.y).abs() < 1e-6
                        && (r.height - f.rect.height).abs() < 1e-6
                        && (r.x + r.width - f.rect.x).abs() < 1e-6
                }) {
                    rect.width += f.rect.width;
                    let _ = previous;
                } else {
                    backgrounds.push((f.rect, color));
                }
            }
        }
        // Native TextRangeToTextBounds returns merged line rectangles, and
        // SnapRectToPixel rounds their edges before rendering the background.
        for (rect, color) in backgrounds {
            let snap = |v: f64| (v * self.dpr).round() / self.dpr;
            let x = snap(rect.x);
            let y = snap(rect.y);
            out.push(Draw::Fill {
                rect: Rect::new(
                    x,
                    y,
                    (snap(rect.x + rect.width) - x).max(0.),
                    (snap(rect.y + rect.height) - y).max(0.),
                ),
                color,
                radius: 0.,
            });
        }
        let mut at = 0;
        while at < n.reading.fragments.len() {
            let first = &n.reading.fragments[at];
            if first.inline.is_some() {
                at += 1;
                continue;
            }
            let mut end = at + 1;
            while end < n.reading.fragments.len() {
                let a = &n.reading.fragments[end - 1];
                let b = &n.reading.fragments[end];
                if b.inline.is_some()
                    || (q.text_alignment == TextAlignment::Justify
                        && (b.text.chars().all(char::is_whitespace)
                            || first.text.chars().all(char::is_whitespace)))
                    || !same_font(first, b)
                    || (a.rect.y - b.rect.y).abs() > 1e-6
                    || (a.rect.x + a.rect.width - b.rect.x).abs() > 1e-5
                {
                    break;
                }
                end += 1;
            }
            let mut logical = n.reading.fragments[at..end].iter().collect::<Vec<_>>();
            logical.sort_by_key(|f| f.start);
            let text = logical.iter().map(|f| f.text.as_str()).collect::<String>();
            let x = first.rect.x;
            let width =
                n.reading.fragments[end - 1].rect.x + n.reading.fragments[end - 1].rect.width - x;
            let mut part = at;
            while part < end {
                let fg = effective(&n.reading.fragments[part]);
                let mut until = part + 1;
                while until < end && effective(&n.reading.fragments[until]) == fg {
                    until += 1;
                }
                let left = n.reading.fragments[part].rect.x;
                let right = n.reading.fragments[until - 1].rect.x
                    + n.reading.fragments[until - 1].rect.width;
                let clipped = part != at || until != end;
                // Shape the whole run for every color span, then clip. Never draw
                // an opaque base under a translucent replacement foreground.
                if clipped {
                    out.push(Draw::Clip {
                        rect: Rect::new(left, first.rect.y, right - left, first.rect.height),
                    });
                }
                out.push(Draw::Text {
                    style: first.font.style,
                    x,
                    y: first.baseline,
                    text: text.clone(),
                    color: fg.clone(),
                    size: first.font.size,
                    font: first.font.family.clone(),
                    max_width: width + 1.,
                    weight: first.font.weight,
                });
                if first.underline || first.strike {
                    out.push(Draw::Fill {
                        rect: Rect::new(
                            left,
                            if first.strike {
                                first.baseline - first.font.size * 0.3
                            } else {
                                first.baseline + 2.
                            },
                            right - left,
                            1. / self.dpr,
                        ),
                        color: fg,
                        radius: 0.,
                    });
                }
                if clipped {
                    out.push(Draw::Restore);
                }
                part = until;
            }
            at = end;
        }
    }
    pub(super) fn rich_snapshot(&self, id: u32) -> Value {
        let n = &self.nodes[&id];
        let owner = self.rich_owner(id);
        let s = &self.nodes[&owner].reading;
        let (a, b) = s.rich_selection;
        json!({"text":s.rich_text,"selectionStart":a.min(b),"selectionLength":a.abs_diff(b),"selectedText":utf16_slice(&s.rich_text,a.min(b),a.max(b)),"start":n.reading.rich_start,"end":n.reading.rich_end,"hasOverflowContent":n.reading.rich_end<s.rich_text.encode_utf16().count(),"links":n.reading.fragments.iter().filter_map(|f|f.link.as_ref().map(|link|json!({"link":link,"text":f.text,"rect":f.rect}))).collect::<Vec<_>>()})
    }
}
