use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        Metrics {
            width: text.chars().count() as f64 * font.size * 0.54,
            ascent: font.size * 0.8,
            descent: font.size * 0.2,
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(1000., 800., 1.25).unwrap();
    s
}
fn frame(s: &mut Scene) {
    for _ in 0..4 {
        s.advance(1000.);
        s.layout(&mut Measure);
    }
}
#[test]
fn chinese_week_start_follows_language_and_preserves_explicit_overrides() {
    fn assert_week(s: &Scene, id: u32, first: u8) {
        let n = &s.nodes[&id];
        let q = n.props.picker_controls.as_deref().unwrap();
        assert_eq!(q.first_day_of_week() as u8, first);
        for i in 0..7 {
            assert_eq!(
                s.nodes[&n.picker.parts[&format!("WeekDay{i}")]].props.text,
                q.calendar_locale.weekdays[(i + first as usize) % 7]
            );
        }
        for (i, cell) in n.picker.cells.iter().enumerate() {
            assert_eq!(
                winui_wasm::picker_value::Date::parse(&cell.date)
                    .unwrap()
                    .weekday(),
                ((i + first as usize) % 7) as u8
            );
        }
        if let Some(cell) = n
            .picker
            .cells
            .iter()
            .find(|cell| Some(cell.node) == s.focused)
        {
            assert_eq!(cell.date, "2026-11-10");
        }
    }
    for kind in [NodeKind::CalendarView, NodeKind::CalendarDatePicker] {
        for calendar in [CalendarIdentifier::Gregorian, CalendarIdentifier::Chinese] {
            let mut s = scene();
            let id=s.create(s.root,kind,json!({"isOpen":true,"pickerControls":{"calendarIdentifier":calendar,"today":"2026-11-10","date":"2026-11-10","minDate":"2020-01-01","maxDate":"2030-12-31"}})).unwrap();
            frame(&mut s);
            let view = if kind == NodeKind::CalendarView {
                id
            } else {
                s.nodes[&id].picker.parts["Calendar"]
            };
            assert_week(&s, view, 0);
            for language in ["zh", "zh-CN", "zh-Hans", "zh-Hant-TW", "ZH-cn"] {
                let day = s.nodes[&view]
                    .picker
                    .cells
                    .iter()
                    .find(|cell| cell.date == "2026-11-10")
                    .unwrap()
                    .node;
                s.input(Input::Focus { id: day }, 1000.).unwrap();
                s.update(vec![Update {
                    id,
                    patch: json!({"pickerControls":{"calendarLocale":{"language":language}}}),
                }])
                .unwrap();
                frame(&mut s);
                assert_week(&s, view, 1);
                assert_eq!(
                    s.nodes[&view]
                        .picker
                        .cells
                        .iter()
                        .find(|cell| Some(cell.node) == s.focused)
                        .unwrap()
                        .date,
                    "2026-11-10"
                );
            }
            s.update(vec![Update {
                id,
                patch: json!({"pickerControls":{"firstDayOfWeek":"Sunday"}}),
            }])
            .unwrap();
            frame(&mut s);
            assert_week(&s, view, 0);
            for language in ["en-US", "zh-CN"] {
                s.update(vec![Update {
                    id,
                    patch: json!({"pickerControls":{"calendarLocale":{"language":language}}}),
                }])
                .unwrap();
                frame(&mut s);
                assert_week(&s, view, 0);
            }
            s.update(vec![Update {
                id,
                patch: json!({"pickerControls":{"firstDayOfWeek":null}}),
            }])
            .unwrap();
            frame(&mut s);
            assert_week(&s, view, 1);
            s.update(vec![Update {
                id,
                patch: json!({"pickerControls":{"calendarLocale":{"language":"en-US"}}}),
            }])
            .unwrap();
            frame(&mut s);
            assert_week(&s, view, 0);
        }
    }
}
#[test]
fn chinese_calendar_annotations_and_leap_month_navigation_use_civil_values() {
    let mut s = scene();
    let id = s.create(s.root, NodeKind::CalendarView, json!({"pickerControls":{"calendarIdentifier":"ChineseCalendar","today":"2026-02-17","displayDate":"2026-02-17"}})).unwrap();
    frame(&mut s);
    let spring = s.nodes[&id]
        .picker
        .cells
        .iter()
        .find(|c| c.date == "2026-02-17")
        .unwrap();
    assert_eq!(spring.text, "17");
    assert_eq!(spring.annotation, "春节");
    assert_eq!(spring.calendar_day.day, 1);
    let child = spring.node;
    s.input(Input::Focus { id: child }, 1000.).unwrap();
    s.input(
        Input::KeyDown {
            key: "PageDown".into(),
            repeat: false,
        },
        1000.,
    )
    .unwrap();
    s.input(
        Input::KeyDown {
            key: "Enter".into(),
            repeat: false,
        },
        1000.,
    )
    .unwrap();
    assert_eq!(
        s.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .selected_dates,
        vec!["2026-03-19"]
    );
    s.update(vec![Update {
        id,
        patch: json!({"pickerControls":{"displayDate":"2026-02-18"}}),
    }])
    .unwrap();
    frame(&mut s);
    s.input(Input::Invoke { id: child }, 1000.).unwrap();
    assert_eq!(
        s.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .selected_dates,
        vec!["2026-02-17"]
    );
    s.update(vec![Update {
        id,
        patch: json!({"pickerControls":{"displayDate":"2025-06-25"}}),
    }])
    .unwrap();
    frame(&mut s);
    let next = s.nodes[&id].picker.parts["NextButton"];
    s.input(Input::Invoke { id: next }, 1000.).unwrap();
    frame(&mut s);
    let leap = s.nodes[&id]
        .picker
        .cells
        .iter()
        .find(|c| c.date == "2025-07-25")
        .unwrap();
    assert!(leap.calendar_day.leap_month);
    assert_eq!(leap.annotation, "闰六月");
    s.update(vec![Update {
        id,
        patch: json!({"pickerControls":{"displayMode":"Year"}}),
    }])
    .unwrap();
    frame(&mut s);
    assert_eq!(
        s.nodes[&id]
            .picker
            .cells
            .iter()
            .filter(|c| c.calendar_day.year == 2025)
            .count(),
        13
    );
    assert!(s.nodes[&id].picker.cells.iter().any(|c| c.text == "闰六月"));
}

#[test]
fn all_calendar_date_wheels_and_range_edges_remain_valid() {
    let mut localized = scene();
    let localized_id=localized.create(localized.root,NodeKind::DatePicker,json!({"isOpen":true,"pickerControls":{"today":"2026-11-10","minDate":"2026-01-01","maxDate":"2026-12-31","formatLocale":{"digits":["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"],"dateOrder":["year","month","day"]}}})).unwrap();
    frame(&mut localized);
    let year_wheel = localized.nodes[&localized_id].picker.parts["FirstWheel"];
    assert!(localized.nodes[&year_wheel]
        .props
        .collection_items
        .iter()
        .any(|item| item.text == "٢٠٢٦"));
    for calendar in [
        CalendarIdentifier::Gregorian,
        CalendarIdentifier::Japanese,
        CalendarIdentifier::Julian,
        CalendarIdentifier::Korean,
        CalendarIdentifier::Taiwan,
        CalendarIdentifier::Thai,
        CalendarIdentifier::Hebrew,
        CalendarIdentifier::Hijri,
        CalendarIdentifier::UmAlQura,
        CalendarIdentifier::Persian,
        CalendarIdentifier::Chinese,
    ] {
        let mut s = scene();
        let id=s.create(s.root,NodeKind::DatePicker,json!({"isOpen":true,"pickerControls":{"calendarIdentifier":calendar,"today":"2026-02-17","date":"2025-07-25","minDate":"2020-01-01","maxDate":"2030-12-31"}})).unwrap();
        frame(&mut s);
        let f = calendar.fields(winui_wasm::picker_value::Date::parse("2025-07-25").unwrap());
        let month = s.nodes[&id].picker.parts["FirstWheel"];
        let texts = s.nodes[&month]
            .props
            .collection_items
            .iter()
            .map(|i| i.text.as_str())
            .collect::<Vec<_>>();
        if calendar == CalendarIdentifier::Chinese {
            assert!(texts.contains(&"闰六月"));
        }
        assert!(!texts.is_empty(), "{calendar:?} {f:?}");
        let accept = s.nodes[&id].picker.parts["AcceptButton"];
        s.input(Input::Invoke { id: accept }, 1000.).unwrap();
        frame(&mut s);
        assert_eq!(
            s.nodes[&id]
                .props
                .picker_controls
                .as_deref()
                .unwrap()
                .date
                .as_deref(),
            Some("2025-07-25")
        );
    }
    let mut s = scene();
    let id=s.create(s.root,NodeKind::CalendarView,json!({"pickerControls":{"calendarIdentifier":"ChineseCalendar","today":"2026-02-17","minDate":"2026-02-17","maxDate":"2026-02-20","displayMode":"Year"}})).unwrap();
    frame(&mut s);
    let first = s.nodes[&id]
        .picker
        .cells
        .iter()
        .find(|c| c.calendar_day.month == 1)
        .unwrap()
        .node;
    s.input(Input::Invoke { id: first }, 1000.).unwrap();
    frame(&mut s);
    assert_eq!(
        s.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .display_mode,
        CalendarViewDisplayMode::Month
    );
    assert!(s.nodes[&id]
        .picker
        .cells
        .iter()
        .any(|c| c.date == "2026-02-17" && s.nodes[&c.node].visible));
    assert!(s.create(s.root,NodeKind::CalendarView,json!({"pickerControls":{"calendarIdentifier":"ChineseCalendar","displayDate":"2101-01-01"}})).unwrap_err().contains("1901"));
}
#[test]
fn five_picker_templates_measure_paint_and_release_all_private_children() {
    for kind in [
        NodeKind::CalendarView,
        NodeKind::CalendarDatePicker,
        NodeKind::DatePicker,
        NodeKind::TimePicker,
        NodeKind::ColorPicker,
    ] {
        let mut s = scene();
        let id = s
            .create(
                s.root,
                kind,
                json!({"pickerControls":{"today":"2026-11-08"}}),
            )
            .unwrap();
        frame(&mut s);
        assert!(s.nodes[&id].rect.width > 0.);
        assert!(s.nodes[&id].rect.height > 0.);
        let _ = s.base_display_list();
        s.destroy(id).unwrap();
        assert_eq!(s.nodes.len(), 1);
    }
}
#[test]
fn calendar_selection_blackout_and_display_modes_remain_rust_owned() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::CalendarView,json!({"pickerControls":{"today":"2026-11-08","minDate":"2020-01-01","maxDate":"2030-12-31","blackoutDates":["2026-11-10"]}})).unwrap();
    frame(&mut s);
    let cell = s.nodes[&id]
        .picker
        .cells
        .iter()
        .find(|c| c.date == "2026-11-08")
        .unwrap()
        .node;
    s.input(Input::Invoke { id: cell }, 1000.).unwrap();
    frame(&mut s);
    assert_eq!(
        s.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .selected_dates,
        vec!["2026-11-08"]
    );
    let header = s.nodes[&id].picker.parts["HeaderButton"];
    s.input(Input::Invoke { id: header }, 1000.).unwrap();
    frame(&mut s);
    assert_eq!(
        s.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .display_mode,
        CalendarViewDisplayMode::Year
    );
    assert!(s.nodes[&id].picker.cells.iter().any(|c| c.text == "Nov"));
}
#[test]
fn picker_property_patch_preserves_locale_bounds_and_emits_nullable_change() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::DatePicker,json!({"pickerControls":{"today":"2026-11-08","minDate":"2020-01-01","maxDate":"2030-12-31"}})).unwrap();
    s.events.clear();
    s.update(vec![Update {
        id,
        patch: json!({"pickerControls":{"date":"2027-02-28"}}),
    }])
    .unwrap();
    let q = s.nodes[&id].props.picker_controls.as_deref().unwrap();
    assert_eq!(q.min_date.as_deref(), Some("2020-01-01"));
    assert_eq!(q.date.as_deref(), Some("2027-02-28"));
    assert_eq!(
        s.events
            .iter()
            .filter(|e| e.kind == EventKind::SelectedDateChanged && e.target == id)
            .count(),
        1
    );
}

#[test]
fn date_and_time_flyouts_keep_pending_values_until_accept_and_restore_after_dismiss() {
    for kind in [NodeKind::DatePicker, NodeKind::TimePicker] {
        let mut s = scene();
        let id=s.create(s.root,kind,json!({"pickerControls":{"today":"2026-11-08","date":"2026-11-08","time":875,"minDate":"2020-01-01","maxDate":"2030-12-31"}})).unwrap();
        frame(&mut s);
        s.update(vec![Update {
            id,
            patch: json!({"isOpen":true}),
        }])
        .unwrap();
        frame(&mut s);
        let pending_date = s.nodes[&id].picker.pending_date;
        assert_eq!(pending_date.unwrap().iso(), "2026-11-08");
        assert_eq!(s.nodes[&id].picker.pending_time, 875);
        let popup = s.nodes[&id].picker.parts["Popup"];
        assert!(s.nodes[&popup].rect.height > 350.);
        assert_eq!(s.background_scroll_root(), Some(popup));
        let _ = s.base_display_list();
        if kind == NodeKind::DatePicker {
            s.nodes.get_mut(&id).unwrap().picker.pending_date =
                Some(winui_wasm::picker_value::Date::parse("2027-02-28").unwrap());
        } else {
            s.nodes.get_mut(&id).unwrap().picker.pending_time = 600;
        }
        let dismiss = s.nodes[&id].picker.parts["DismissButton"];
        s.input(Input::Invoke { id: dismiss }, 1000.).unwrap();
        frame(&mut s);
        assert!(!s.nodes[&id].props.is_open);
        assert_eq!(
            s.nodes[&id]
                .props
                .picker_controls
                .as_deref()
                .unwrap()
                .date
                .as_deref(),
            Some("2026-11-08")
        );
        assert_eq!(
            s.nodes[&id].props.picker_controls.as_deref().unwrap().time,
            Some(875)
        );
        s.update(vec![Update {
            id,
            patch: json!({"isOpen":true}),
        }])
        .unwrap();
        frame(&mut s);
        assert_eq!(
            s.nodes[&id].picker.pending_date.unwrap().iso(),
            "2026-11-08"
        );
        assert_eq!(s.nodes[&id].picker.pending_time, 875);
        if kind == NodeKind::DatePicker {
            s.nodes.get_mut(&id).unwrap().picker.pending_date =
                Some(winui_wasm::picker_value::Date::parse("2027-02-28").unwrap());
        } else {
            s.nodes.get_mut(&id).unwrap().picker.pending_time = 600;
        }
        let accept = s.nodes[&id].picker.parts["AcceptButton"];
        s.input(Input::Invoke { id: accept }, 1000.).unwrap();
        frame(&mut s);
        let q = s.nodes[&id].props.picker_controls.as_deref().unwrap();
        if kind == NodeKind::DatePicker {
            assert_eq!(q.date.as_deref(), Some("2027-02-28"));
        } else {
            assert_eq!(q.time, Some(600));
        }
        assert!(!s.nodes[&id].props.is_open);
    }
}
#[test]
fn calendar_flyout_selection_commits_and_closes() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::CalendarDatePicker,
            json!({"isOpen":true,"pickerControls":{"today":"2026-11-08"}}),
        )
        .unwrap();
    frame(&mut s);
    let calendar = s.nodes[&id].picker.parts["Calendar"];
    let cell = s.nodes[&calendar]
        .picker
        .cells
        .iter()
        .find(|c| c.date == "2026-11-12")
        .unwrap()
        .node;
    s.input(Input::Invoke { id: cell }, 1000.).unwrap();
    frame(&mut s);
    assert_eq!(
        s.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .date
            .as_deref(),
        Some("2026-11-12")
    );
    assert!(!s.nodes[&id].props.is_open);
}
#[test]
fn color_keyboard_synchronizes_channels_and_external_changes_do_not_duplicate_events() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::ColorPicker,
            json!({"pickerControls":{"color":"#ff000080","isAlphaEnabled":true}}),
        )
        .unwrap();
    frame(&mut s);
    let spectrum = s.nodes[&id].picker.parts["Spectrum"];
    s.input(Input::Focus { id: spectrum }, 1000.).unwrap();
    s.input(
        Input::KeyDown {
            key: "ArrowRight".into(),
            repeat: false,
        },
        1000.,
    )
    .unwrap();
    frame(&mut s);
    assert!(s.nodes[&id].picker.hsv.unwrap().h > 0.);
    let hex = s.nodes[&id].picker.parts["HexTextBox"];
    assert!(s.nodes[&hex].props.text.starts_with("#80"));
    s.events.clear();
    s.update(vec![Update {
        id,
        patch: json!({"pickerControls":{"color":"#00800080"}}),
    }])
    .unwrap();
    frame(&mut s);
    assert_eq!(
        s.events
            .iter()
            .filter(|e| e.target == id && e.kind == EventKind::ColorChanged)
            .count(),
        1
    );
    let green = s.nodes[&id].picker.parts["Channel1"];
    assert_eq!(s.nodes[&green].props.text, "128");
    let _ = s.base_display_list();
}

#[test]
fn picker_display_lists_balance_clips_and_layers_in_all_templates() {
    use winui_wasm::render::Draw;
    for kind in [
        NodeKind::CalendarView,
        NodeKind::CalendarDatePicker,
        NodeKind::DatePicker,
        NodeKind::TimePicker,
        NodeKind::ColorPicker,
    ] {
        for open in [false, true] {
            let mut s = scene();
            s.create(s.root,kind,json!({"isOpen":open,"pickerControls":{"today":"2026-11-08","color":"#0078d7cc","isAlphaEnabled":true,"previousColor":"#ff000080","isMoreButtonVisible":true}})).unwrap();
            frame(&mut s);
            let mut depth = 0;
            let mut layers = 0;
            for draw in s.base_display_list() {
                match draw {
                    Draw::Save
                    | Draw::Clip { .. }
                    | Draw::RoundedClip { .. }
                    | Draw::CornerClip { .. } => depth += 1,
                    Draw::Restore => {
                        depth -= 1;
                        assert!(depth >= 0, "{kind:?} over-restored");
                    }
                    Draw::Layer { .. } | Draw::WindowLayer { .. } | Draw::VectorLayer { .. } => {
                        layers += 1
                    }
                    Draw::EndLayer => layers -= 1,
                    _ => {}
                }
            }
            assert_eq!(depth, 0, "{kind:?} unbalanced clipping");
            assert_eq!(layers, 0, "{kind:?} unbalanced layers");
        }
    }
}

#[test]
fn calendar_sdk_zoom_tracks_finish_and_interrupt_without_unbalanced_commands() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(1000., 800., 1.25).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::CalendarView,
            json!({"pickerControls":{"today":"2026-11-08"}}),
        )
        .unwrap();
    frame(&mut s);
    s.base_display_list();
    s.update(vec![Update {
        id,
        patch: json!({"pickerControls":{"displayMode":"Year"}}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    s.base_display_list();
    assert!(s.nodes[&id].picker.animating(1000.));
    s.advance(1100.);
    s.layout(&mut Measure);
    let commands = s.base_display_list();
    assert!(commands
        .iter()
        .any(|c| matches!(c,winui_wasm::render::Draw::Layer{opacity} if *opacity>0.&&*opacity<1.)));
    s.update(vec![Update {
        id,
        patch: json!({"pickerControls":{"displayMode":"Month"}}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    s.base_display_list();
    assert!(s.nodes[&id].picker.animating(1100.));
    s.advance(1700.);
    s.layout(&mut Measure);
    s.base_display_list();
    assert!(!s.nodes[&id].picker.animating(1700.));
}

#[test]
fn template_arrange_does_not_feed_previous_field_width_into_later_measurement() {
    let mut s = scene();
    let months = (1..=12).map(|m| format!("{m}月")).collect::<Vec<_>>();
    let date=s.create(s.root,NodeKind::DatePicker,json!({"pickerControls":{"today":"2026-11-08","formatLocale":{"dateOrder":["year","month","day"],"months":months,"yearSuffix":"年","daySuffix":"日","labels":{"year":"年","month":"月","day":"天"}}}})).unwrap();
    frame(&mut s);
    s.update(vec![Update {
        id: date,
        patch: json!({"pickerControls":{"date":"2026-11-08"}}),
    }])
    .unwrap();
    frame(&mut s);
    let field = s.nodes[&date].picker.parts["Field0"];
    assert_eq!(s.nodes[&field].props.text, "2026年");
    assert!(
        s.nodes[&field].rect.width >= 5. * 14. * 0.54 - 0.001,
        "field={:?}, text={:?}, props={:?}",
        s.nodes[&field].rect,
        s.nodes[&field].text.width,
        s.nodes[&field].props.width
    );
    assert!(s.nodes[&field].props.width.is_none());
    let time = s
        .create(
            s.root,
            NodeKind::TimePicker,
            json!({"pickerControls":{"time":545,"clockIdentifier":"24HourClock"}}),
        )
        .unwrap();
    frame(&mut s);
    s.update(vec![Update {
        id: time,
        patch: json!({"pickerControls":{"time":605}}),
    }])
    .unwrap();
    frame(&mut s);
    let field = s.nodes[&time].picker.parts["Field0"];
    assert_eq!(s.nodes[&field].props.text, "10");
    assert!(s.nodes[&field].rect.width >= 2. * 14. * 0.54 - 0.001);
}
#[test]
fn calendar_paging_uses_scroll_motion_and_retargeting_preserves_layout() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(1000., 800., 1.25).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::CalendarView,
            json!({"pickerControls":{"today":"2026-11-08"}}),
        )
        .unwrap();
    frame(&mut s);
    s.base_display_list();
    let before = s.nodes[&id].rect;
    let next = s.nodes[&id].picker.parts["NextButton"];
    s.input(Input::Invoke { id: next }, 1000.).unwrap();
    s.layout(&mut Measure);
    s.base_display_list();
    assert!(s.nodes[&id].picker.calendar_scroll.active(1000.));
    assert!(
        (s.nodes[&id].picker.calendar_scroll_distance - 4. * s.nodes[&id].picker.cell).abs()
            < 0.001
    );
    s.advance(1060.);
    s.layout(&mut Measure);
    s.base_display_list();
    let progress = s.nodes[&id].picker.calendar_scroll.value(1060.);
    assert!(progress > 0. && progress < 1.);
    let previous = s.nodes[&id].picker.parts["PreviousButton"];
    s.input(Input::Invoke { id: previous }, 1060.).unwrap();
    s.layout(&mut Measure);
    s.base_display_list();
    assert!(s.nodes[&id].picker.calendar_scroll.active(1060.));
    s.advance(2000.);
    s.layout(&mut Measure);
    s.base_display_list();
    assert!(!s.nodes[&id].picker.calendar_scroll.active(2000.));
    assert_eq!(s.nodes[&id].rect, before);
}
#[test]
fn keyboard_navigation_and_pending_popup_escape_do_not_require_a_render_frame() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::CalendarView,
            json!({"pickerControls":{"today":"2026-11-08"}}),
        )
        .unwrap();
    frame(&mut s);
    let day = s.nodes[&id]
        .picker
        .cells
        .iter()
        .find(|c| c.date == "2026-11-08")
        .unwrap()
        .node;
    s.input(Input::Focus { id: day }, 1000.).unwrap();
    s.input(
        Input::KeyDown {
            key: "ArrowRight".into(),
            repeat: false,
        },
        1000.,
    )
    .unwrap();
    s.input(
        Input::KeyDown {
            key: "Enter".into(),
            repeat: false,
        },
        1000.,
    )
    .unwrap();
    assert_eq!(
        s.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .selected_dates,
        vec!["2026-11-09"]
    );
    let picker = s.create(s.root, NodeKind::DatePicker, json!({})).unwrap();
    frame(&mut s);
    let input = s.nodes[&picker].picker.parts["InputButton"];
    s.input(Input::Invoke { id: input }, 1000.).unwrap();
    s.input(
        Input::KeyDown {
            key: "Escape".into(),
            repeat: false,
        },
        1000.,
    )
    .unwrap();
    frame(&mut s);
    assert!(!s.nodes[&picker].props.is_open);
    assert!(s.background_scroll_root().is_none());
}

#[test]
fn selecting_a_visible_out_of_scope_day_does_not_change_the_displayed_month() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::CalendarView,
            json!({"pickerControls":{"today":"2026-11-08"}}),
        )
        .unwrap();
    frame(&mut s);
    let before = s.nodes[&id].picker.date;
    let day = s.nodes[&id]
        .picker
        .cells
        .iter()
        .find(|c| c.date == "2026-12-01")
        .unwrap()
        .node;
    s.input(Input::Invoke { id: day }, 1000.).unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&id].picker.date, before);
    assert_eq!(
        s.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .selected_dates,
        vec!["2026-12-01"]
    );
}

#[test]
fn calendar_flyout_initial_selection_does_not_dismiss_the_open_request() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::CalendarDatePicker,
            json!({"isOpen":true,"pickerControls":{"today":"2026-11-08","date":"2026-11-08"}}),
        )
        .unwrap();
    frame(&mut s);
    assert!(s.nodes[&id].props.is_open);
    let popup = s.nodes[&id].picker.parts["Popup"];
    assert!(s.nodes[&popup].rect.height > 350.);
}
#[test]
fn gallery_day_pattern_updates_face_and_wheel_weekdays_after_month_change() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::DatePicker,json!({"pickerControls":{"date":"2026-11-08","yearVisible":false,"dayFormat":"{day.integer} ({dayofweek.abbreviated})"}})).unwrap();
    frame(&mut s);
    let day = s.nodes[&id].picker.parts["Field1"];
    assert_eq!(s.nodes[&day].props.text, "8 (Sun)");
    s.update(vec![Update {
        id,
        patch: json!({"pickerControls":{"date":"2026-12-08"},"isOpen":true}),
    }])
    .unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&day].props.text, "8 (Tue)");
    let wheel = s.nodes[&id].picker.parts["SecondWheel"];
    assert!(s.nodes[&wheel]
        .props
        .collection_items
        .iter()
        .any(|item| item.text == "8 (Tue)"));
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"pickerControls":{"dayFormat":"{unsupported}"}})
        }])
        .is_err());
}
#[test]
fn gallery_rectangle_accepts_the_native_gradient_border_resource() {
    for theme in [Theme::Light, Theme::Dark] {
        let mut s = Scene::new(theme, true);
        s.resize(300., 120., 1.25).unwrap();
        s.create(s.root,NodeKind::Rectangle,json!({"width":250,"height":100,"fill":"#008000","stroke":{"resource":"TextControlBorderBrush"},"strokeThickness":1})).unwrap();
        frame(&mut s);
        assert!(s.base_display_list().iter().any(|draw|matches!(draw,winui_wasm::render::Draw::PathBrush{brush,..} if brush.kind=="linearGradient")));
    }
}
