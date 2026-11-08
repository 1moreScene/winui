use super::*;

impl Scene {
    pub(in crate::scene) fn picker_value_events(
        &mut self,
        id: u32,
        old: &PickerProperties,
        new: &PickerProperties,
    ) {
        let kind = self.nodes[&id].kind;
        if old.date != new.date {
            self.nodes.get_mut(&id).unwrap().picker.date =
                new.date.as_deref().and_then(|v| Date::parse(v).ok());
            if self.nodes[&id].props.is_open {
                self.nodes.get_mut(&id).unwrap().picker.wheel_values.clear();
                self.nodes.get_mut(&id).unwrap().picker.pending_date = Some(
                    new.date
                        .as_deref()
                        .and_then(|v| Date::parse(v).ok())
                        .unwrap_or_else(|| new.today()),
                );
            }
            let payload = json!({"oldDate":old.date,"newDate":new.date,"date":new.date});
            self.emit_composed(id, EventKind::DateChanged, payload.clone());
            self.emit_composed(id, EventKind::SelectedDateChanged, payload);
        }
        if old.time != new.time {
            let payload = json!({"oldTime":old.time,"newTime":new.time,"time":new.time});
            if self.nodes[&id].props.is_open {
                self.nodes.get_mut(&id).unwrap().picker.wheel_values.clear();
                self.nodes.get_mut(&id).unwrap().picker.pending_time =
                    new.time.unwrap_or(new.now_minutes);
            }
            self.emit_composed(id, EventKind::TimeChanged, payload.clone());
            self.emit_composed(id, EventKind::SelectedTimeChanged, payload);
        }
        if old.color != new.color {
            self.emit_composed(
                id,
                EventKind::ColorChanged,
                json!({"oldColor":old.color,"newColor":new.color,"color":new.color}),
            );
        }
        if kind == NodeKind::CalendarView && old.selected_dates != new.selected_dates {
            let added = new
                .selected_dates
                .iter()
                .filter(|v| !old.selected_dates.contains(v))
                .cloned()
                .collect::<Vec<_>>();
            let removed = old
                .selected_dates
                .iter()
                .filter(|v| !new.selected_dates.contains(v))
                .cloned()
                .collect::<Vec<_>>();
            self.emit_composed(id,EventKind::SelectedDatesChanged,json!({"addedDates":added,"removedDates":removed,"selectedDates":new.selected_dates}));
        }
        if old.display_mode != new.display_mode {
            if kind == NodeKind::CalendarView {
                self.start_calendar_transition(id, old.display_mode, new.display_mode);
            }
            self.emit_composed(
                id,
                EventKind::DisplayModeChanged,
                json!({"oldMode":old.display_mode,"newMode":new.display_mode}),
            );
        }
    }
    fn picker_change(&mut self, id: u32, change: impl FnOnce(&mut PickerProperties)) {
        let old = self.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .clone();
        let mut new = old.clone();
        change(&mut new);
        self.nodes.get_mut(&id).unwrap().props.picker_controls = Some(Box::new(new.clone()));
        self.nodes.get_mut(&id).unwrap().picker.signature.clear();
        self.picker_value_events(id, &old, &new);
        self.invalidate(id, true);
    }
    fn picker_choose_date(&mut self, id: u32, date: Date) {
        let q = self.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .clone();
        let text = date.iso();
        if date < q.bounds().0 || date > q.bounds().1 || q.blackout_dates.contains(&text) {
            return;
        }
        self.nodes.get_mut(&id).unwrap().picker.focus_date = Some(date);
        if q.display_mode != CalendarViewDisplayMode::Month {
            self.nodes.get_mut(&id).unwrap().picker.date = Some(date);
            self.picker_change(id, |p| {
                p.display_mode = if p.display_mode == CalendarViewDisplayMode::Decade {
                    CalendarViewDisplayMode::Year
                } else {
                    CalendarViewDisplayMode::Month
                }
            });
            return;
        }
        self.picker_change(id, |p| match p.calendar_selection_mode {
            CalendarViewSelectionMode::None => {}
            CalendarViewSelectionMode::Single => {
                if p.selected_dates.contains(&text) {
                    p.selected_dates.clear();
                } else {
                    p.selected_dates = vec![text];
                }
            }
            CalendarViewSelectionMode::Multiple => {
                if p.selected_dates.contains(&text) {
                    p.selected_dates.retain(|v| v != &text);
                } else {
                    p.selected_dates.push(text);
                }
            }
        });
    }
    fn picker_navigate(&mut self, id: u32, direction: i32) {
        let q = self.nodes[&id].props.picker_controls.as_deref().unwrap();
        let step = match q.display_mode {
            CalendarViewDisplayMode::Month => 1,
            CalendarViewDisplayMode::Year => 12,
            CalendarViewDisplayMode::Decade => 120,
        };
        let date = self.nodes[&id]
            .picker
            .date
            .unwrap_or_else(|| q.day())
            .add_months(direction * step)
            .clamp(q.bounds().0, q.bounds().1);
        let old = self.nodes[&id].picker.date.unwrap_or_else(|| q.day());
        self.start_calendar_scroll(id, old, date);
        self.nodes.get_mut(&id).unwrap().picker.date = Some(date);
        self.nodes.get_mut(&id).unwrap().picker.signature.clear();
        self.nodes.get_mut(&id).unwrap().picker.focus_date = Some(date);
        self.invalidate(id, true);
    }
    fn set_picker_color(&mut self, id: u32, mut hsv: Hsv) {
        let q = self.nodes[&id].props.picker_controls.as_deref().unwrap();
        hsv.h = hsv.h.clamp(q.min_hue, q.max_hue);
        hsv.s = hsv
            .s
            .clamp(q.min_saturation / 100., q.max_saturation / 100.);
        hsv.v = hsv.v.clamp(q.min_value / 100., q.max_value / 100.);
        hsv.a = hsv.a.clamp(0., 1.);
        let color = hsv.css();
        let state = &mut self.nodes.get_mut(&id).unwrap().picker;
        state.hsv = Some(hsv);
        state.last_color = color.clone();
        self.picker_change(id, |p| p.color = color);
    }
    pub(in crate::scene) fn picker_template_event(&mut self, event: &SceneEvent) -> bool {
        let Some(child) = self.nodes.get(&event.target) else {
            return false;
        };
        let Some(owner) = child.picker.owner else {
            return false;
        };
        if !self.nodes.contains_key(&owner) {
            return false;
        }
        let role = child.picker.role.clone();
        let kind = self.nodes[&owner].kind;
        if event.kind == EventKind::Click {
            match role.as_str() {
                "HeaderButton" => self.picker_change(owner, |p| {
                    p.display_mode = if p.display_mode == CalendarViewDisplayMode::Month {
                        CalendarViewDisplayMode::Year
                    } else {
                        CalendarViewDisplayMode::Decade
                    }
                }),
                "PreviousButton" => self.picker_navigate(owner, -1),
                "NextButton" => self.picker_navigate(owner, 1),
                "InputButton" => {
                    self.nodes.get_mut(&owner).unwrap().props.is_open = true;
                    self.invalidate(owner, true);
                }
                "AcceptButton" => {
                    let date = self.nodes[&owner].picker.pending_date;
                    let time = self.nodes[&owner].picker.pending_time;
                    self.picker_change(owner, |p| {
                        if kind == NodeKind::TimePicker {
                            p.time = Some(time)
                        } else {
                            p.date = date.map(Date::iso)
                        }
                    });
                    self.nodes.get_mut(&owner).unwrap().props.is_open = false;
                    self.invalidate(owner, true);
                }
                "DismissButton" => {
                    self.nodes.get_mut(&owner).unwrap().props.is_open = false;
                    self.invalidate(owner, true);
                }
                _ if role.ends_with("WheelUpButton") || role.ends_with("WheelDownButton") => {
                    let up = role.ends_with("UpButton");
                    let wheel_role =
                        role.trim_end_matches(if up { "UpButton" } else { "DownButton" });
                    let wheel = self.nodes[&owner].picker.parts[wheel_role];
                    let state = &self.nodes[&wheel].scroll;
                    let index = ((state.offsets(self.time)[1] + state.viewport[1] / 2. - 20.) / 40.)
                        .round() as i32
                        + if up { -1 } else { 1 };
                    let count = self.nodes[&owner].picker.wheel_values[wheel_role].len();
                    self.move_picker_wheel(
                        owner,
                        wheel_role,
                        index.clamp(4, count.saturating_sub(5) as i32) as usize,
                        true,
                    );
                }
                "PreviousColor" => {
                    if let Some(value) = self.nodes[&owner]
                        .props
                        .picker_controls
                        .as_deref()
                        .unwrap()
                        .previous_color
                        .clone()
                    {
                        self.set_picker_color(owner, Hsv::from_rgba(crate::material::rgba(&value)));
                    }
                }
                "MoreButton" => {
                    let checked = self.nodes[&event.target].props.is_checked == Some(true);
                    self.nodes.get_mut(&owner).unwrap().picker.more_expanded = checked;
                    self.nodes.get_mut(&owner).unwrap().picker.signature.clear();
                    self.invalidate(owner, true);
                }
                _ if role.starts_with("Day") => {
                    if let Some(cell) = self.nodes[&owner]
                        .picker
                        .cells
                        .iter()
                        .find(|c| c.node == event.target)
                    {
                        let date = Date::parse(&cell.date).unwrap();
                        self.picker_choose_date(owner, date);
                    }
                }
                _ => {}
            }
        } else if role == "Popup" {
            if event.kind == EventKind::Closing {
                if let Some(request) = event.request_id {
                    let _ = self.resolve_overlay_close(event.target, request, false);
                }
            }
            if event.kind == EventKind::Closed {
                self.nodes.get_mut(&owner).unwrap().props.is_open = false;
                self.nodes.get_mut(&owner).unwrap().picker.opened = false;
                self.emit_composed(owner, EventKind::Closed, json!({}));
            }
            if event.kind == EventKind::Opened {
                self.emit_composed(owner, EventKind::Opened, json!({}));
            }
        } else if role == "Calendar" && event.kind == EventKind::SelectedDatesChanged {
            let date = self.nodes[&event.target]
                .props
                .picker_controls
                .as_deref()
                .unwrap()
                .selected_dates
                .first()
                .cloned();
            // Synchronizing the private calendar is not a user commit.
            if self.nodes[&owner]
                .props
                .picker_controls
                .as_deref()
                .unwrap()
                .date
                == date
            {
                return true;
            }
            self.picker_change(owner, |p| p.date = date);
            self.nodes.get_mut(&owner).unwrap().props.is_open = false;
            self.invalidate(owner, true);
        } else if role == "Representation" && event.kind == EventKind::SelectionChanged {
            let hsv = self.nodes[&event.target].props.selected_index == 1;
            self.picker_change(owner, |p| {
                p.color_representation = if hsv {
                    ColorRepresentation::Hsv
                } else {
                    ColorRepresentation::Rgb
                }
            });
        } else if event.kind == EventKind::ValueChanged
            && matches!(role.as_str(), "ThirdDimensionSlider" | "AlphaSlider")
        {
            let mut hsv = self.nodes[&owner].picker.hsv.unwrap();
            let value = self.nodes[&event.target].props.value;
            let q = self.nodes[&owner].props.picker_controls.as_deref().unwrap();
            if role == "AlphaSlider" {
                hsv.a = value / 100.;
            } else {
                match Self::third_dimension(q, hsv).0 {
                    "hue" => hsv.h = value,
                    "saturation" => hsv.s = value / 100.,
                    _ => hsv.v = value / 100.,
                }
            }
            self.set_picker_color(owner, hsv);
        } else if event.kind == EventKind::TextChanged
            && kind == NodeKind::ColorPicker
            && self.focused == Some(event.target)
        {
            let text = self.nodes[&event.target].props.text.trim().to_string();
            self.nodes.get_mut(&owner).unwrap().picker.editing_part = Some(event.target);
            let q = self.nodes[&owner].props.picker_controls.as_deref().unwrap();
            let mut hsv = self.nodes[&owner].picker.hsv.unwrap();
            let valid = if role == "HexTextBox" {
                if let Some(color) = Hsv::from_hex(&text, q.is_alpha_enabled) {
                    hsv = color;
                    true
                } else {
                    false
                }
            } else if let Ok(value) = text.trim_end_matches('%').parse::<f64>() {
                if !value.is_finite() {
                    false
                } else if role == "AlphaTextBox" {
                    hsv.a = value / 100.;
                    (0.0..=100.0).contains(&value)
                } else if let Some(index) = role
                    .strip_prefix("Channel")
                    .and_then(|v| v.parse::<usize>().ok())
                    .filter(|v| *v < 3)
                {
                    if q.color_representation == ColorRepresentation::Rgb {
                        let mut rgb = hsv.rgba();
                        rgb[index] = value / 255.;
                        hsv = Hsv::from_rgba(rgb);
                        (0.0..=255.0).contains(&value)
                    } else {
                        match index {
                            0 => hsv.h = value,
                            1 => hsv.s = value / 100.,
                            _ => hsv.v = value / 100.,
                        };
                        value >= 0. && value <= if index == 0 { 359. } else { 100. }
                    }
                } else {
                    false
                }
            } else {
                false
            };
            if valid {
                self.set_picker_color(owner, hsv);
            }
        } else if role.ends_with("Wheel")
            && matches!(event.kind, EventKind::ViewChanged | EventKind::ItemClick)
        {
            if event.kind == EventKind::ItemClick {
                if let Some(index) = event.item_id.as_ref().and_then(|key| {
                    self.nodes[&event.target]
                        .props
                        .collection_items
                        .iter()
                        .position(|item| &item.id == key)
                }) {
                    self.move_picker_wheel(owner, &role, index, true);
                }
            } else {
                self.read_picker_wheel(owner, &role);
            }
            if let Some(request) = event.request_id {
                let _ = self.input(
                    Input::CollectionCommit {
                        id: event.target,
                        request,
                    },
                    self.time,
                );
            }
        }
        true
    }
    pub(in crate::scene) fn sync_picker_wheels(&mut self, id: u32, opening: bool) {
        let n = &self.nodes[&id];
        let kind = n.kind;
        let q = n.props.picker_controls.as_deref().unwrap().clone();
        let date = n.picker.pending_date.unwrap_or_else(|| q.today());
        let time = n.picker.pending_time;
        let fields = if kind == NodeKind::DatePicker {
            self.date_fields(&q)
        } else {
            self.time_fields(&q)
        };
        self.nodes.get_mut(&id).unwrap().picker.wheel_fields = fields.clone();
        for (i, field) in fields.iter().enumerate() {
            let role = ["FirstWheel", "SecondWheel", "ThirdWheel"][i];
            for direction in ["Up", "Down"] {
                self.patch_part(id,&format!("{role}{direction}Button"),json!({"accessibleName":format!("{} {}",if direction=="Up"{"Previous"}else{"Next"},q.format_locale.label(field))}));
            }
            let mut values = Vec::new();
            let mut labels = Vec::new();
            let chosen;
            match field.as_str() {
                "year" => {
                    let (min, max) = q.bounds();
                    for year in min.year..=max.year {
                        values.push(year);
                        labels.push(format!(
                            "{}{}",
                            q.format_locale.number(year),
                            q.format_locale.year_suffix
                        ));
                    }
                    chosen = date.year;
                }
                "month" => {
                    for month in 1..=12 {
                        values.push(month);
                        labels.push(q.format_locale.months[month as usize - 1].clone());
                    }
                    chosen = date.month as i32;
                }
                "day" => {
                    for day in 1..=Date::month_days(date.year, date.month) {
                        values.push(day as i32);
                        labels.push(q.format_day(Date::new(date.year, date.month, day).unwrap()));
                    }
                    chosen = date.day as i32;
                }
                "hour" => {
                    let length = if q.clock_identifier == ClockIdentifier::TwelveHour {
                        12
                    } else {
                        24
                    };
                    for h in 0..length {
                        values.push(h);
                        labels.push(q.format_locale.number(if h == 0 && length == 12 {
                            12
                        } else {
                            h
                        }));
                    }
                    chosen = if length == 12 {
                        time / 60 % 12
                    } else {
                        time / 60
                    } as i32;
                }
                "minute" => {
                    for m in (0..60).step_by(q.minute_increment.max(1) as usize) {
                        values.push(m);
                        labels.push(if m < 10 {
                            format!("{}{}", q.format_locale.digits[0], q.format_locale.number(m))
                        } else {
                            q.format_locale.number(m)
                        });
                    }
                    chosen = (time % 60) as i32;
                }
                _ => {
                    values = vec![0, 1];
                    labels = q.format_locale.periods.clone();
                    chosen = i32::from(time >= 720);
                }
            }
            let looping = field != "year"
                && field != "period"
                && !(field == "minute" && q.minute_increment == 0);
            let count = values.len();
            let selected = values.iter().position(|v| *v == chosen).unwrap_or(0);
            let mut expanded = vec![i32::MIN; 4];
            let mut items = (0..4)
                .map(|j| json!({"id":format!("{field}-pad-{j}"),"text":"","enabled":false}))
                .collect::<Vec<_>>();
            for cycle in 0..if looping { 9 } else { 1 } {
                for j in 0..count {
                    expanded.push(values[j]);
                    items.push(json!({"id":format!("{field}-{cycle}-{j}"),"text":labels[j]}));
                }
            }
            for j in 0..4 {
                expanded.push(i32::MIN);
                items.push(json!({"id":format!("{field}-end-{j}"),"text":"","enabled":false}));
            }
            let changed = self.nodes[&id].picker.wheel_values.get(role) != Some(&expanded);
            if changed || opening {
                self.patch_part(id,role,json!({"collectionItems":items,"itemContainerStyle":{"minHeight":0,"margin":[0,0,0,0],"padding":if field=="month"{[9,3,0,6]}else{[0,3,0,6]},"horizontalContentAlignment":if field=="month"{"Left"}else{"Center"}}}));
                let state = &mut self.nodes.get_mut(&id).unwrap().picker;
                state.wheel_values.insert(role.into(), expanded);
                state.wheel_initial.insert(
                    role.into(),
                    4 + if looping {
                        4 * count + selected
                    } else {
                        selected
                    },
                );
            }
        }
    }
    pub(in crate::scene) fn initialize_picker_wheel_offsets(&mut self, id: u32) {
        let initial = std::mem::take(&mut self.nodes.get_mut(&id).unwrap().picker.wheel_initial);
        for (role, index) in initial {
            self.move_picker_wheel(id, &role, index, false);
        }
    }
    fn move_picker_wheel(&mut self, id: u32, role: &str, index: usize, animated: bool) {
        let wheel = self.nodes[&id].picker.parts[role];
        let h = self.nodes[&wheel].scroll.viewport[1];
        if h <= 0. {
            self.nodes
                .get_mut(&id)
                .unwrap()
                .picker
                .wheel_initial
                .insert(role.into(), index);
            return;
        }
        let _ = self.scroll_change(
            wheel,
            None,
            Some(index as f64 * 40. + 20. - h / 2.),
            None,
            animated,
        );
        if !animated {
            self.read_picker_wheel(id, role);
        }
    }
    fn read_picker_wheel(&mut self, id: u32, role: &str) {
        let wheel = self.nodes[&id].picker.parts[role];
        let n = &self.nodes[&wheel];
        let active = n.scroll.active(self.time);
        let Some(values) = self.nodes[&id].picker.wheel_values.get(role).cloned() else {
            return;
        };
        if values.is_empty() {
            return;
        }
        let offset = n.scroll.offsets(self.time)[1];
        let h = n.scroll.viewport[1];
        let index = ((offset + h / 2. - 20.) / 40.)
            .round()
            .clamp(0., (values.len() - 1) as f64) as usize;
        let value = values[index];
        if value == i32::MIN {
            return;
        }
        let position = ["FirstWheel", "SecondWheel", "ThirdWheel"]
            .iter()
            .position(|key| *key == role)
            .unwrap();
        let field = self.nodes[&id].picker.wheel_fields[position].clone();
        let q = self.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .clone();
        if self.nodes[&id].kind == NodeKind::DatePicker {
            let mut date = self.nodes[&id]
                .picker
                .pending_date
                .unwrap_or_else(|| q.today());
            match field.as_str() {
                "year" => date.year = value,
                "month" => date.month = value as u8,
                _ => date.day = value as u8,
            };
            date.day = date.day.min(Date::month_days(date.year, date.month));
            self.nodes.get_mut(&id).unwrap().picker.pending_date =
                Some(date.clamp(q.bounds().0, q.bounds().1));
        } else {
            let old = self.nodes[&id].picker.pending_time;
            let next = match field.as_str() {
                "hour" => {
                    if q.clock_identifier == ClockIdentifier::TwelveHour {
                        (old / 720 * 12 + value as u16) * 60 + old % 60
                    } else {
                        value as u16 * 60 + old % 60
                    }
                }
                "minute" => old / 60 * 60 + value as u16,
                _ => value as u16 * 720 + old % 720,
            };
            self.nodes.get_mut(&id).unwrap().picker.pending_time = next;
        }
        self.nodes.get_mut(&id).unwrap().picker.signature.clear();
        let looped =
            field != "year" && field != "period" && !(field == "minute" && q.minute_increment == 0);
        let count = if looped {
            (values.len() - 8) / 9
        } else {
            values.len() - 8
        };
        if looped && (index < 4 + count || index >= 4 + count * 8) {
            let centered = 4 + count * 4 + (index - 4) % count;
            self.move_picker_wheel(id, role, centered, false);
            return;
        }
        if !active && ((index as f64 * 40. + 20. - h / 2.) - offset).abs() > 0.01 {
            self.move_picker_wheel(id, role, index, true);
        }
    }
    pub(in crate::scene) fn picker_popup_focus(&self, popup: u32) -> Option<u32> {
        let n = &self.nodes[&popup];
        if n.picker.role != "Popup" {
            return None;
        }
        let owner = n.picker.owner?;
        let p = &self.nodes[&owner].picker;
        if let Some(calendar) = p.parts.get("Calendar") {
            self.nodes[calendar]
                .picker
                .cells
                .iter()
                .find(|cell| {
                    self.nodes[&cell.node].props.is_tab_stop && self.nodes[&cell.node].visible
                })
                .map(|c| c.node)
        } else {
            p.parts.get("FirstWheel").copied()
        }
    }
    pub(in crate::scene) fn picker_input(&mut self, input: &Input) -> Result<bool, String> {
        if let Input::Focus { id } = input {
            if let Some(n) = self.nodes.get(id) {
                if is_control(n.kind) && n.enabled {
                    let part = if n.kind == NodeKind::CalendarView {
                        n.picker
                            .cells
                            .iter()
                            .find(|c| self.nodes[&c.node].props.is_tab_stop)
                            .map(|c| c.node)
                    } else {
                        n.picker
                            .parts
                            .get(if n.kind == NodeKind::ColorPicker {
                                "Spectrum"
                            } else {
                                "InputButton"
                            })
                            .copied()
                    };
                    if let Some(part) = part {
                        self.focus(Some(part));
                        return Ok(true);
                    }
                }
            }
        }
        let pointer = match input {
            Input::Down { x, y, pointer } => Some((*x, *y, *pointer, 0)),
            Input::Move { x, y, pointer } => Some((*x, *y, *pointer, 1)),
            Input::Up { x, y, pointer } => Some((*x, *y, *pointer, 2)),
            Input::Touch {
                x,
                y,
                pointer,
                phase,
            } => Some((
                *x,
                *y,
                *pointer,
                if phase == "start" || phase == "down" {
                    0
                } else if phase == "end" || phase == "up" {
                    2
                } else {
                    1
                },
            )),
            _ => None,
        };
        if let Some((x, y, pointer, phase)) = pointer {
            if !x.is_finite() || !y.is_finite() {
                return Err("Picker pointer must be finite".into());
            }
            if phase == 0 {
                if let Some(part) = self.hit(x, y) {
                    let n = &self.nodes[&part];
                    if n.picker.role == "Spectrum" && n.enabled {
                        let owner = n.picker.owner.unwrap();
                        self.nodes.get_mut(&owner).unwrap().picker.spectrum_touch =
                            matches!(input, Input::Touch { .. });
                        self.captured = Some((pointer, part));
                        self.focus(Some(part));
                        self.nodes.get_mut(&part).unwrap().button.pressed = true;
                        self.picker_spectrum_point(owner, x, y);
                        return Ok(true);
                    }
                }
            } else if let Some((capture, part)) = self.captured {
                if capture == pointer && self.nodes[&part].picker.role == "Spectrum" {
                    let owner = self.nodes[&part].picker.owner.unwrap();
                    self.picker_spectrum_point(owner, x, y);
                    if phase == 2 {
                        self.captured = None;
                        self.nodes.get_mut(&part).unwrap().button.pressed = false;
                    }
                    return Ok(true);
                }
            }
        }
        if matches!(input, Input::Cancel { .. }) {
            if let Some((_, part)) = self.captured {
                if self.nodes[&part].picker.role == "Spectrum" {
                    self.captured = None;
                    self.nodes.get_mut(&part).unwrap().button.pressed = false;
                    return Ok(true);
                }
            }
        }
        if let Input::KeyDown { key, .. } = input {
            if key == "Escape" {
                let pending = self
                    .nodes
                    .values()
                    .filter(|n| {
                        matches!(
                            n.kind,
                            NodeKind::DatePicker
                                | NodeKind::TimePicker
                                | NodeKind::CalendarDatePicker
                        ) && n.props.is_open
                    })
                    .max_by_key(|n| self.nodes[&n.picker.parts["Popup"]].overlay.order)
                    .map(|n| n.id);
                if let Some(id) = pending {
                    self.nodes.get_mut(&id).unwrap().props.is_open = false;
                    self.invalidate(id, true);
                    return Ok(true);
                }
            }
        }
        let Input::KeyDown { key, .. } = input else {
            return Ok(false);
        };
        let Some(focused) = self.focused else {
            return Ok(false);
        };
        let Some(owner) = self.nodes.get(&focused).and_then(|n| n.picker.owner) else {
            return Ok(false);
        };
        if !self.nodes[&focused].enabled {
            return Ok(false);
        }
        let role = self.nodes[&focused].picker.role.clone();
        let kind = self.nodes[&owner].kind;
        if role == "InputButton" && matches!(key.as_str(), "Alt+ArrowDown" | "F4") {
            self.nodes.get_mut(&owner).unwrap().props.is_open = true;
            return Ok(true);
        }
        if kind == NodeKind::CalendarView && role.starts_with("Day") {
            let q = self.nodes[&owner]
                .props
                .picker_controls
                .as_deref()
                .unwrap()
                .clone();
            let date = self.nodes[&owner]
                .picker
                .cells
                .iter()
                .find(|c| c.node == focused)
                .and_then(|c| Date::parse(&c.date).ok())
                .unwrap_or_else(|| q.day());
            if matches!(key.as_str(), "Enter" | " ") {
                self.picker_choose_date(owner, date);
                return Ok(true);
            }
            let columns = if q.display_mode == CalendarViewDisplayMode::Month {
                7
            } else {
                q.year_columns
            } as i32;
            let direction = match key.as_str() {
                "ArrowLeft" => -1,
                "ArrowRight" => 1,
                "ArrowUp" => -columns,
                "ArrowDown" => columns,
                _ => 0,
            };
            let rtl = self.effective_flow_direction(owner) == FlowDirection::RightToLeft;
            let direction = if rtl && matches!(key.as_str(), "ArrowLeft" | "ArrowRight") {
                -direction
            } else {
                direction
            };
            let next = if direction != 0 {
                match q.display_mode {
                    CalendarViewDisplayMode::Month => date.add_days(direction),
                    CalendarViewDisplayMode::Year => date.add_months(direction),
                    CalendarViewDisplayMode::Decade => date.add_months(direction * 12),
                }
            } else if key == "PageUp" || key == "PageDown" {
                date.add_months(
                    if key == "PageUp" { -1 } else { 1 }
                        * match q.display_mode {
                            CalendarViewDisplayMode::Month => 1,
                            CalendarViewDisplayMode::Year => 12,
                            CalendarViewDisplayMode::Decade => 120,
                        },
                )
            } else if key == "Home" {
                Date { day: 1, ..date }
            } else if key == "End" {
                Date {
                    day: Date::month_days(date.year, date.month),
                    ..date
                }
            } else {
                return Ok(false);
            };
            let next = next.clamp(q.bounds().0, q.bounds().1);
            self.nodes.get_mut(&owner).unwrap().picker.focus_date = Some(next);
            self.nodes.get_mut(&owner).unwrap().picker.signature.clear();
            if !self.nodes[&owner]
                .picker
                .cells
                .iter()
                .any(|cell| cell.date == next.iso() && self.nodes[&cell.node].visible)
            {
                let old = self.nodes[&owner].picker.date.unwrap_or_else(|| q.day());
                self.start_calendar_scroll(owner, old, next);
                self.nodes.get_mut(&owner).unwrap().picker.date = Some(next);
            }
            let realized = self.nodes[&owner]
                .picker
                .cells
                .iter()
                .find(|cell| cell.date == next.iso() && self.nodes[&cell.node].visible)
                .map(|cell| cell.node);
            if let Some(part) = realized {
                self.focus(Some(part));
            } else {
                self.nodes.get_mut(&owner).unwrap().picker.pending_focus = Some(next);
            }
            self.invalidate(owner, true);
            return Ok(true);
        }
        if role.ends_with("Wheel") {
            if key == "ArrowLeft" || key == "ArrowRight" {
                let fields = &self.nodes[&owner].picker.wheel_fields;
                let current = ["FirstWheel", "SecondWheel", "ThirdWheel"]
                    .iter()
                    .position(|v| *v == role)
                    .unwrap();
                let right = (key == "ArrowRight")
                    ^ (self.effective_flow_direction(owner) == FlowDirection::RightToLeft);
                let next = if right {
                    (current + 1).min(fields.len().saturating_sub(1))
                } else {
                    current.saturating_sub(1)
                };
                self.focus(Some(
                    self.nodes[&owner].picker.parts
                        [["FirstWheel", "SecondWheel", "ThirdWheel"][next]],
                ));
                return Ok(true);
            }
            if key == "Enter" {
                let date = self.nodes[&owner].picker.pending_date;
                let time = self.nodes[&owner].picker.pending_time;
                self.picker_change(owner, |p| {
                    if kind == NodeKind::TimePicker {
                        p.time = Some(time)
                    } else {
                        p.date = date.map(Date::iso)
                    }
                });
                self.nodes.get_mut(&owner).unwrap().props.is_open = false;
                return Ok(true);
            }
            let offset = self.nodes[&focused].scroll.offsets(self.time)[1];
            let h = self.nodes[&focused].scroll.viewport[1];
            let current = ((offset + h / 2. - 20.) / 40.).round() as i32;
            let length = self.nodes[&owner]
                .picker
                .wheel_values
                .get(&role)
                .map_or(0, Vec::len);
            let index = match key.as_str() {
                "ArrowUp" => current - 1,
                "ArrowDown" => current + 1,
                "PageUp" => current - 8,
                "PageDown" => current + 8,
                "Home" => 4,
                "End" => length as i32 - 5,
                _ => return Ok(false),
            };
            self.move_picker_wheel(
                owner,
                &role,
                index.clamp(4, length.saturating_sub(5) as i32) as usize,
                true,
            );
            return Ok(true);
        }
        if kind == NodeKind::ColorPicker && role == "Spectrum" {
            return Ok(self.picker_spectrum_key(owner, key));
        }
        Ok(false)
    }
    fn picker_spectrum_point(&mut self, id: u32, x: f64, y: f64) {
        let n = &self.nodes[&id];
        let q = n.props.picker_controls.as_deref().unwrap();
        let r = n.picker.spectrum;
        let (x, y) = n.world.inverse().unwrap_or_default().point(x, y);
        let mut x = x - r.x;
        if self.effective_flow_direction(id) == FlowDirection::RightToLeft {
            x = r.width - x;
        }
        let spectrum = self.picker_spectrum_definition(id);
        let hsv = spectrum.hit(
            x,
            y - r.y,
            r.width.round().max(1.) as u32,
            n.picker.hsv.unwrap(),
        );
        let _ = q;
        self.set_picker_color(id, hsv);
    }
    fn picker_spectrum_key(&mut self, id: u32, key: &str) -> bool {
        let n = &self.nodes[&id];
        let q = n.props.picker_controls.as_deref().unwrap();
        let mut hsv = n.picker.hsv.unwrap();
        let horizontal = matches!(key, "ArrowLeft" | "ArrowRight");
        if !horizontal && !matches!(key, "ArrowUp" | "ArrowDown") {
            return false;
        }
        use ColorSpectrumComponents::*;
        let channel = match (q.color_spectrum_components, horizontal) {
            (HueSaturation | HueValue, true) | (SaturationHue | ValueHue, false) => 0,
            (SaturationHue | SaturationValue, true) | (HueSaturation | ValueSaturation, false) => 1,
            _ => 2,
        };
        let lower = if channel == 0 {
            matches!(key, "ArrowLeft" | "ArrowUp")
        } else {
            matches!(key, "ArrowRight" | "ArrowDown")
        };
        let invert = horizontal
            && ((self.effective_flow_direction(id) == FlowDirection::RightToLeft)
                ^ (q.color_spectrum_components == SaturationValue));
        let delta = if lower ^ invert { -1. } else { 1. };
        let (min, max, value) = match channel {
            0 => (q.min_hue, q.max_hue, hsv.h),
            1 => (q.min_saturation, q.max_saturation, hsv.s * 100.),
            _ => (q.min_value, q.max_value, hsv.v * 100.),
        };
        let next = if value + delta < min {
            if value == min {
                max
            } else {
                min
            }
        } else if value + delta > max {
            if value == max {
                min
            } else {
                max
            }
        } else {
            value + delta
        };
        match channel {
            0 => hsv.h = next,
            1 => hsv.s = next / 100.,
            _ => hsv.v = next / 100.,
        };
        self.set_picker_color(id, hsv);
        true
    }
}
