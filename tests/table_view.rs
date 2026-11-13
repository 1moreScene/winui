use serde_json::{json, Value};
use winui_wasm::{
    enums::*,
    scene::{
        table_view::{columns, csv, view, TableProperties},
        Input, Scene, Update,
    },
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;

#[test]
fn retained_row_commands_reuse_static_content_and_match_fresh_animation_samples() {
    use winui_wasm::render::{expand_retained, Draw};
    fn first_row(list: &[Draw]) -> std::sync::Arc<Vec<Draw>> {
        list.iter()
            .find_map(|draw| {
                if let Draw::RetainedGroup { commands, .. } = draw {
                    Some(commands.clone())
                } else {
                    None
                }
            })
            .unwrap()
    }
    let (mut s, id) = scene(20);
    s.reduced_motion = false;
    s.layout(&mut Measure);
    let a = s.display_list();
    let b = s.display_list();
    assert!(
        std::sync::Arc::ptr_eq(&first_row(&a), &first_row(&b)),
        "Unchanged rows should share their actual drawing commands"
    );
    let body = s
        .nodes
        .values()
        .find(|n| {
            n.kind == NodeKind::ScrollViewer
                && n.props.accessible_name.as_deref() == Some("Table rows")
        })
        .unwrap()
        .id;
    s.input(
        Input::Scroll {
            id: body,
            x: None,
            y: Some(0.25),
            zoom: None,
            animated: false,
        },
        0.,
    )
    .unwrap();
    s.layout(&mut Measure);
    let scrolled = s.display_list();
    assert!(
        std::sync::Arc::ptr_eq(&first_row(&b), &first_row(&scrolled)),
        "A scroll input must not invalidate unchanged row drawing commands"
    );
    s.update(vec![Update {
        id,
        patch: json!({"table":{"selectionUnit":"Row"}}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    drive(&mut s, id, "selectAll", json!({}));
    for frame in 0..=25 {
        s.advance(frame as f64 * 1000. / 120.);
        s.layout(&mut Measure);
        let cached = s.display_list();
        s.invalidate(id, true);
        s.layout(&mut Measure);
        let fresh = s.display_list();
        assert_eq!(
            *expand_retained(&cached),
            *expand_retained(&fresh),
            "Cached row commands must observe the current selection animation sample"
        );
    }
    s.reduced_motion = true;
    let text = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::TextBlock && n.props.text == "Name 0")
        .unwrap()
        .id;
    s.update(vec![Update {
        id: text,
        patch: json!({"foreground":"#ff0000"}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    let cached = s.display_list();
    s.invalidate(id, true);
    s.layout(&mut Measure);
    let fresh = s.display_list();
    assert_eq!(
        *expand_retained(&cached),
        *expand_retained(&fresh),
        "Paint-only child properties must invalidate the row commands"
    );
    for input in [
        Input::Move {
            pointer: 1,
            x: 70.,
            y: 50.,
        },
        Input::Down {
            pointer: 1,
            x: 70.,
            y: 50.,
        },
        Input::Up {
            pointer: 1,
            x: 70.,
            y: 50.,
        },
    ] {
        s.input(input, 400.).unwrap();
        s.layout(&mut Measure);
        let cached = s.display_list();
        s.invalidate(id, true);
        s.layout(&mut Measure);
        let fresh = s.display_list();
        assert_eq!(
            *expand_retained(&cached),
            *expand_retained(&fresh),
            "Hover and capture/release must not retain stale pressed colors"
        );
    }
}

#[test]
fn vertical_realization_only_measures_entering_rows_and_matches_full_layout() {
    struct Count(usize);
    impl TextMeasurer for Count {
        fn measure(&mut self, text: &str, font: &Font) -> Metrics {
            self.0 += 1;
            Measure.measure(text, font)
        }
    }
    let (mut incremental, id) = scene(10000);
    let (mut full, full_id) = scene(10000);
    incremental.layout(&mut Measure);
    full.layout(&mut Measure);
    let body = |s: &Scene| {
        s.nodes
            .values()
            .find(|n| {
                n.kind == NodeKind::ScrollViewer
                    && n.props.accessible_name.as_deref() == Some("Table rows")
            })
            .unwrap()
            .id
    };
    for y in [41., 82., 123., 250., 80., 0.] {
        let mut measurements = Count(0);
        for (s, force) in [(&mut incremental, false), (&mut full, true)] {
            s.input(
                Input::Scroll {
                    id: body(s),
                    x: None,
                    y: Some(y),
                    zoom: None,
                    animated: false,
                },
                1000. + y,
            )
            .unwrap();
            if force {
                s.invalidate(full_id, true);
            }
            s.layout(&mut measurements);
        }
        let a = incremental.display_list();
        let b = full.display_list();
        assert_eq!(
            *winui_wasm::render::expand_retained(&a),
            *winui_wasm::render::expand_retained(&b),
            "Incremental realization at {y} must preserve every draw command"
        );
        assert_eq!(
            state(&mut incremental, id)["realized"],
            state(&mut full, full_id)["realized"]
        );
        let mut idle = Count(0);
        incremental.layout(&mut idle);
        assert_eq!(
            idle.0, 0,
            "Realization must not leave the whole table dirty for the next frame"
        );
    }
    let (mut s, id) = scene(10000);
    s.layout(&mut Measure);
    let mut count = Count(0);
    s.input(
        Input::Scroll {
            id: body(&s),
            x: None,
            y: Some(41.),
            zoom: None,
            animated: false,
        },
        0.,
    )
    .unwrap();
    s.layout(&mut count);
    let entering = count.0;
    s.invalidate(id, true);
    count.0 = 0;
    s.layout(&mut count);
    assert!(entering*3<count.0,"One entering row should cost less than a third of a viewport measurement: {entering} vs {}",count.0);
}

#[test]
fn native_timeline_samples_at_120hz_without_changing_duration_or_view_identity() {
    let (mut s, id) = scene(10000);
    s.reduced_motion = false;
    drive(
        &mut s,
        id,
        "sort",
        json!({"column":"age","direction":"Descending"}),
    );
    resolve(&mut s, id, false, json!({}));
    let keys = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .table
        .unwrap()
        .view_keys;
    let mut offsets = Vec::new();
    for frame in 0..=81 {
        let time = frame as f64 * 1000. / 120.;
        s.advance(time);
        s.layout(&mut Measure);
        let table = s
            .snapshot()
            .nodes
            .into_iter()
            .find(|n| n.id == id)
            .unwrap()
            .table
            .unwrap();
        assert!(
            std::sync::Arc::ptr_eq(&keys, &table.view_keys),
            "Animation samples must share the stable 10,000-row identities"
        );
        offsets.push(table.motion.unwrap().body_offset_y);
        let list = s.display_list();
        let flat = winui_wasm::render::expand_retained(&list);
        assert!(winui_wasm::render::command_count(&list, 100000) >= flat.len());
    }
    assert!(
        offsets.windows(2).take(75).filter(|w| w[0] > w[1]).count() > 65,
        "No 16ms/60Hz quantization may stall every other sample"
    );
    assert!(offsets[79] > 0.);
    assert_eq!(offsets[81], 0.);
}

#[test]
fn scrolling_translates_stable_table_glyphs_instead_of_snapping_each_frame() {
    use winui_wasm::render::Draw;
    fn glyph(s: &mut Scene) -> (f64, [f64; 2]) {
        let list = s.base_display_list();
        winui_wasm::render::expand_retained(&list)
            .windows(2)
            .find_map(|draw| match (&draw[0], &draw[1]) {
                (Draw::TextRasterPhase { phase }, Draw::Text { text, y, .. })
                    if text == "Name 0" =>
                {
                    Some((*y, *phase))
                }
                _ => None,
            })
            .unwrap()
    }
    let (mut s, _) = scene(20);
    let body = s
        .nodes
        .values()
        .find(|n| {
            n.kind == NodeKind::ScrollViewer
                && n.props.accessible_name.as_deref() == Some("Table rows")
        })
        .unwrap()
        .id;
    let initial = glyph(&mut s);
    for offset in [0.1, 0.3, 0.7, 1.1, 2.3] {
        s.input(
            Input::Scroll {
                id: body,
                x: None,
                y: Some(offset),
                zoom: None,
                animated: false,
            },
            0.,
        )
        .unwrap();
        s.layout(&mut Measure);
        assert_eq!(
            glyph(&mut s),
            initial,
            "The glyph baseline/phase must remain fixed before the scroll transform"
        );
    }
}

#[test]
fn smooth_scroll_reuses_slots_until_the_realized_range_changes() {
    struct Count(usize);
    impl TextMeasurer for Count {
        fn measure(&mut self, s: &str, f: &Font) -> Metrics {
            self.0 += 1;
            Measure.measure(s, f)
        }
    }
    for headers in [
        TableViewHeadersVisibility::All,
        TableViewHeadersVisibility::None,
    ] {
        let (mut s, id) = scene(10000);
        s.update(vec![Update {
            id,
            patch: json!({"table":{"headersVisibility":headers}}),
        }])
        .unwrap();
        s.layout(&mut Measure);
        let body = s
            .nodes
            .values()
            .find(|n| {
                n.kind == NodeKind::ScrollViewer
                    && n.props.accessible_name.as_deref() == Some("Table rows")
            })
            .unwrap()
            .id;
        let slot = state(&mut s, id)["realized"]
            .as_array()
            .unwrap()
            .iter()
            .find(|slot| slot["row"] == "r0" && slot["column"] == "name")
            .unwrap()["id"]
            .as_u64()
            .unwrap() as u32;
        let y = s.get(slot).unwrap().world.0[5];
        let mut count = Count(0);
        s.input(
            Input::Scroll {
                id: body,
                x: None,
                y: Some(5.),
                zoom: None,
                animated: false,
            },
            0.,
        )
        .unwrap();
        s.layout(&mut count);
        assert_eq!(
            count.0, 0,
            "Sub-row scrolling only updates the compositor transform"
        );
        assert_eq!(s.get(slot).unwrap().world.0[5], y - 5.);
        s.input(
            Input::Scroll {
                id: body,
                x: None,
                y: Some(250.),
                zoom: None,
                animated: false,
            },
            0.,
        )
        .unwrap();
        s.layout(&mut count);
        assert!(
            count.0 > 0,
            "Crossing a realized range boundary still measures new rows"
        );
    }
}

#[test]
fn clicking_another_cell_dismisses_filter_before_the_table_consumes_the_press() {
    let (mut s, id) = scene(12);
    s.resize(640., 900., 1.25).unwrap();
    drive(&mut s, id, "openFilter", json!({"column":"group"}));
    let menu = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::Flyout && n.props.is_open)
        .unwrap()
        .id;
    let slot = state(&mut s, id)["realized"]
        .as_array()
        .unwrap()
        .iter()
        .find(|slot| slot["row"] == "r0" && slot["column"] == "name")
        .unwrap()["id"]
        .as_u64()
        .unwrap() as u32;
    let (x, y) = s.get(slot).unwrap().world.point(20., 16.);
    s.input(Input::Down { x, y, pointer: 1 }, 1.).unwrap();
    s.input(Input::Up { x, y, pointer: 1 }, 2.).unwrap();
    s.layout(&mut Measure);
    assert!(!s.get(menu).unwrap().props.is_open);
    assert!(
        state(&mut s, id)["currentCell"].is_null(),
        "Light dismiss consumes the press before background selection"
    );
}

#[test]
fn filter_list_scrollbar_captures_drags_outside_its_owner_and_releases() {
    let (mut s, id) = scene(1000);
    s.resize(640., 900., 1.25).unwrap();
    drive(&mut s, id, "openFilter", json!({"column":"name"}));
    s.layout(&mut Measure);
    let list = s
        .nodes
        .values()
        .find(|n| {
            n.kind == NodeKind::ListView
                && n.props.accessible_name.as_deref() == Some("Filter values")
        })
        .unwrap()
        .id;
    let n = s.get(list).unwrap();
    let thumb = n.scroll.thumb(&n.props, true, s.time).unwrap();
    let (x, y) = n
        .world
        .point(thumb.x + thumb.width / 2., thumb.y + thumb.height / 2.);
    s.input(Input::Down { x, y, pointer: 1 }, 1.).unwrap();
    assert_eq!(s.captured, Some((1, list)));
    s.input(
        Input::Move {
            x: x + 40.,
            y: y + 100.,
            pointer: 1,
        },
        2.,
    )
    .unwrap();
    s.layout(&mut Measure);
    assert!(s.get(list).unwrap().props.vertical_offset > 500.);
    s.input(
        Input::Up {
            x: x + 40.,
            y: y + 100.,
            pointer: 1,
        },
        3.,
    )
    .unwrap();
    assert!(s.captured.is_none());
    let offset = s.get(list).unwrap().props.vertical_offset;
    s.input(
        Input::Move {
            x,
            y: y + 140.,
            pointer: 1,
        },
        4.,
    )
    .unwrap();
    assert_eq!(s.get(list).unwrap().props.vertical_offset, offset);
}

#[test]
fn table_animation_and_hover_do_not_remeasure_unchanged_realized_content() {
    struct Count(usize);
    impl TextMeasurer for Count {
        fn measure(&mut self, s: &str, f: &Font) -> Metrics {
            self.0 += 1;
            Measure.measure(s, f)
        }
    }
    let (mut s, id) = scene(10000);
    s.reduced_motion = false;
    drive(
        &mut s,
        id,
        "sort",
        json!({"column":"age","direction":"Descending"}),
    );
    resolve(&mut s, id, false, json!({}));
    let mut counter = Count(0);
    s.layout(&mut counter);
    let initial = counter.0;
    for time in [16., 32., 48., 64., 80., 96.] {
        s.advance(time);
        s.input(
            Input::Move {
                x: 40.,
                y: 80.,
                pointer: 1,
            },
            time,
        )
        .unwrap();
        s.layout(&mut counter);
        s.base_display_list();
    }
    assert_eq!(
        counter.0, initial,
        "Paint-only animation/hover must reuse the measured cell tree"
    );
    assert!(state(&mut s, id)["motion"]["bodyOffsetY"].as_f64().unwrap() > 0.);
    s.input(
        serde_json::from_value(
            json!({"kind":"table","id":id,"action":"scrollIntoView","data":{"row":"r0"}}),
        )
        .unwrap(),
        s.time,
    )
    .unwrap();
    s.layout(&mut counter);
    assert!(
        counter.0 > initial,
        "Scrolling to another realized range must still measure its content"
    );
}

#[test]
fn filter_checkboxes_keep_pointer_and_keyboard_changes_until_apply_or_cancel() {
    let (mut s, id) = scene(6);
    s.resize(640., 900., 1.25).unwrap();
    drive(&mut s, id, "openFilter", json!({"column":"group"}));
    s.layout(&mut Measure);
    let checkbox = s
        .nodes
        .values()
        .find(|n| n.props.layout_key == "table-filter-value:\"B\"")
        .unwrap()
        .id;
    let all = s
        .nodes
        .values()
        .find(|n| n.props.layout_key == "table-filter-all")
        .unwrap()
        .id;
    let (x, y) = s.get(checkbox).unwrap().world.point(8., 16.);
    s.input(Input::Down { x, y, pointer: 1 }, 1.).unwrap();
    s.input(Input::Up { x, y, pointer: 1 }, 2.).unwrap();
    s.layout(&mut Measure);
    assert_eq!(s.get(checkbox).unwrap().props.is_checked, Some(false));
    assert_eq!(s.get(all).unwrap().props.is_checked, None);
    assert!(state(&mut s, id)["filters"].as_array().unwrap().is_empty());
    s.input(
        Input::KeyDown {
            key: " ".into(),
            repeat: false,
        },
        3.,
    )
    .unwrap();
    s.input(Input::KeyUp { key: " ".into() }, 4.).unwrap();
    s.layout(&mut Measure);
    assert_eq!(s.get(checkbox).unwrap().props.is_checked, Some(true));
    let (x, y) = s.get(all).unwrap().world.point(8., 16.);
    s.input(Input::Down { x, y, pointer: 1 }, 5.).unwrap();
    s.input(Input::Up { x, y, pointer: 1 }, 6.).unwrap();
    s.layout(&mut Measure);
    assert_eq!(s.get(checkbox).unwrap().props.is_checked, Some(false));
    let apply = s
        .nodes
        .values()
        .find(|n| n.props.layout_key == "table-filter-apply")
        .unwrap()
        .id;
    let (x, y) = s.get(apply).unwrap().world.point(16., 16.);
    s.input(Input::Down { x, y, pointer: 1 }, 7.).unwrap();
    s.input(Input::Up { x, y, pointer: 1 }, 8.).unwrap();
    s.layout(&mut Measure);
    assert_eq!(state(&mut s, id)["filteredCount"], 0);
}

#[test]
fn hovering_filter_popup_does_not_paint_hover_on_the_table_beneath_it() {
    let (mut s, id) = scene(6);
    s.resize(640., 900., 1.25).unwrap();
    drive(&mut s, id, "openFilter", json!({"column":"group"}));
    s.layout(&mut Measure);
    s.input(Input::Leave, 0.).unwrap();
    s.layout(&mut Measure);
    let baseline = serde_json::to_value(s.base_display_list()).unwrap();
    let checkbox = s
        .nodes
        .values()
        .find(|n| n.props.layout_key == "table-filter-value:\"A\"")
        .unwrap()
        .id;
    let (x, y) = s.get(checkbox).unwrap().world.point(8., 16.);
    s.input(Input::Move { x, y, pointer: 1 }, 0.).unwrap();
    s.layout(&mut Measure);
    let actual = serde_json::to_value(s.base_display_list()).unwrap();
    assert!(
        actual == baseline,
        "Only the floating surface may change when the pointer is over its checkbox"
    );
}

#[test]
fn filter_surface_owns_disabled_commands_separators_padding_and_button_gaps() {
    let (mut s,id)=scene(6);
    s.resize(640.,900.,1.25).unwrap();
    drive(&mut s,id,"openFilter",json!({"column":"group"}));
    s.layout(&mut Measure);
    s.input(Input::Leave,0.).unwrap();s.layout(&mut Measure);
    let baseline=s.base_display_list();
    let popup=s.nodes.values().find(|n|n.kind==NodeKind::Flyout&&n.props.is_open).unwrap().id;
    assert!(s.floating_input_regions().iter().any(|(id,rect)|*id==popup&&rect.contains(100.,1.)),"The platform input island must cover the same popup chrome");
    let mut points=vec![("top padding",s.nodes[&popup].world.point(100.,1.)),("left margin",s.nodes[&popup].world.point(2.,160.))];
    for key in ["table-filter-unsort","table-filter-clear"] {
        let n=s.nodes.values().find(|n|n.props.layout_key==key).unwrap();
        assert!(!n.enabled);
        points.push((key,n.world.point(n.rect.width/2.,n.rect.height/2.)));
    }
    let ok=s.nodes.values().find(|n|n.props.layout_key=="table-filter-apply").unwrap();
    points.push(("button gap",ok.world.point(ok.rect.width+8.,ok.rect.height/2.)));
    let panel=s.nodes[&popup].children[0];
    let separator=s.nodes[&panel].children.iter().map(|id|&s.nodes[id]).find(|n|n.kind==NodeKind::Border).unwrap();
    points.push(("separator",separator.world.point(100.,separator.rect.height/2.)));
    for (label,(x,y)) in points {
        let mut at=s.hit(x,y);let mut in_popup=false;
        while let Some(id)=at {if id==popup {in_popup=true;break;}at=s.nodes[&id].parent;}
        assert!(in_popup,"{label} must hit the floating surface, not content below it");
        s.input(Input::Move{pointer:1,x,y},0.).unwrap();s.layout(&mut Measure);
        assert!(s.base_display_list()==baseline,"{label} must not paint hover in the underlying table");
    }
    let(x,y)=s.nodes[&popup].world.point(100.,1.);
    s.input(Input::Down{pointer:1,x,y},0.).unwrap();s.input(Input::Up{pointer:1,x,y},0.).unwrap();s.layout(&mut Measure);
    assert!(s.nodes[&popup].props.is_open,"Inside chrome must not light-dismiss the filter");
    assert!(state(&mut s,id)["currentCell"].is_null());
    let name=state(&mut s,id)["realized"].as_array().unwrap().iter().find(|slot|slot["role"]=="cell"&&slot["column"]=="name").unwrap()["id"].as_u64().unwrap() as u32;
    let(x,y)=s.nodes[&name].world.point(10.,20.);
    s.input(Input::Move{pointer:1,x,y},0.).unwrap();s.layout(&mut Measure);
    assert!(s.base_display_list()!=baseline,"Table hover must still work outside the popup");
}

#[test]
fn reduced_motion_filter_realizes_every_visible_checkbox_in_its_first_layout() {
    let(mut s,id)=scene(6);s.reduced_motion=true;
    s.resize(640.,900.,1.25).unwrap();s.layout(&mut Measure);
    s.input(serde_json::from_value::<Input>(json!({"kind":"table","id":id,"action":"openFilter","data":{"column":"group"}})).unwrap(),s.time).unwrap();
    s.layout(&mut Measure);
    let slots=s.snapshot().nodes.into_iter().find(|n|n.kind==NodeKind::ListView&&n.props.accessible_name.as_deref()==Some("Filter values")).unwrap().collection.unwrap().realized;
    assert_eq!(slots.len(),2);
    for slot in slots {
        assert!(s.nodes[&slot.id].children.iter().any(|child|s.nodes[child].kind==NodeKind::CheckBox),"Every realized filter container must have its native checkbox before the first frame is returned");
    }
}

#[test]
fn corner_menu_preserves_source_icons_commands_and_export_visibility() {
    let (mut s, id) = scene(6);
    s.resize(640., 900., 1.25).unwrap();
    s.update(vec![Update {
        id,
        patch: json!({"table":{"cornerButtonMode":"Options","showExportOptions":true}}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    let corner = s
        .nodes
        .values()
        .find(|n| n.props.accessible_name.as_deref() == Some("Table options"))
        .unwrap()
        .id;
    let (x, y) = s.get(corner).unwrap().world.point(8., 16.);
    s.input(Input::Down { x, y, pointer: 1 }, 0.).unwrap();
    s.input(Input::Up { x, y, pointer: 1 }, 0.).unwrap();
    s.layout(&mut Measure);
    let menu = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::MenuFlyout && n.props.is_open)
        .unwrap()
        .id;
    let items = &s.get(menu).unwrap().props.menu_items;
    assert_eq!(
        items
            .iter()
            .filter(|i| i.kind != MenuEntryKind::Separator)
            .map(|i| i.id.as_str())
            .collect::<Vec<_>>(),
        [
            "selectAll",
            "clearSelection",
            "copy",
            "paste",
            "copyWithHeaders",
            "clearSorting",
            "clearFilters",
            "ungroupAll",
            "export",
            "exportSelected"
        ]
    );
    for (key, glyph) in [
        ("selectAll", "\u{e8b3}"),
        ("clearSelection", "\u{e8e6}"),
        ("copy", "\u{e8c8}"),
        ("paste", "\u{e77f}"),
        ("export", "\u{ede1}"),
        ("exportSelected", "\u{ede1}"),
    ] {
        assert_eq!(items.iter().find(|i| i.id == key).unwrap().icon, glyph);
    }
    assert!(!items.iter().find(|i| i.id == "copy").unwrap().enabled);
    assert!(
        !items
            .iter()
            .find(|i| i.id == "exportSelected")
            .unwrap()
            .enabled
    );
    assert!(items.iter().find(|i| i.id == "export").unwrap().enabled);
    s.update(vec![Update {
        id,
        patch: json!({"table":{"showExportOptions":false}}),
    }])
    .unwrap();
    // Opening another surface on the same table must discard the destroyed
    // filter's focus and realization handles before the corner menu opens.
    drive(&mut s, id, "openFilter", json!({"column":"group"}));
    s.input(Input::Down { x, y, pointer: 1 }, 0.).unwrap();
    s.input(Input::Up { x, y, pointer: 1 }, 0.).unwrap();
    s.layout(&mut Measure);
    // Light dismiss consumes the first press; another press opens the corner.
    s.input(Input::Down { x, y, pointer: 1 }, 0.).unwrap();
    s.input(Input::Up { x, y, pointer: 1 }, 0.).unwrap();
    s.layout(&mut Measure);
    let menu = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::MenuFlyout && n.props.is_open)
        .unwrap();
    assert!(!menu
        .props
        .menu_items
        .iter()
        .any(|i| i.id.starts_with("export")));
}

#[test]
fn a_double_tap_in_another_cell_commits_then_starts_the_target_editor() {
    let (mut s, id) = scene(6);
    drive(
        &mut s,
        id,
        "beginEdit",
        json!({"cell":{"row":"r0","column":"name"}}),
    );
    resolve(&mut s, id, false, json!({}));
    let snap = state(&mut s, id);
    let slot = snap["realized"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["row"] == "r1" && n["column"] == "age")
        .unwrap()["id"]
        .as_u64()
        .unwrap() as u32;
    let (x, y) = s.get(slot).unwrap().world.point(20., 20.);
    s.input(Input::Down { x, y, pointer: 1 }, 10.).unwrap();
    resolve(&mut s, id, false, json!({}));
    s.input(Input::Up { x, y, pointer: 1 }, 20.).unwrap();
    s.input(Input::Down { x, y, pointer: 1 }, 30.).unwrap();
    resolve(&mut s, id, false, json!({}));
    assert_eq!(
        state(&mut s, id)["editingCell"],
        json!({"row":"r1","column":"age"})
    );
}

#[test]
fn table_clips_and_animation_layers_balance_for_both_renderer_consumers() {
    use winui_wasm::render::Draw;
    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
        let (mut s, id) = scene(6);
        s.theme = theme;
        s.reduced_motion = false;
        s.update(vec![Update {
            id,
            patch: json!({"table":{"frozenColumnCount":1,"groups":[{"column":"group"}],"defaultGroupState":"Expanded","areStickyGroupHeadersEnabled":true}}),
        }])
        .unwrap();
        drive(
            &mut s,
            id,
            "sort",
            json!({"column":"age","direction":"Descending"}),
        );
        resolve(&mut s, id, false, json!({}));
        for time in [0., 125., 667.] {
            s.advance(time);
            s.layout(&mut Measure);
            let (mut depth, mut layers) = (0, 0);
            for draw in winui_wasm::render::expand_retained(&s.display_list()).iter() {
                match draw {
                    Draw::Save
                    | Draw::Clip { .. }
                    | Draw::RoundedClip { .. }
                    | Draw::CornerClip { .. } => depth += 1,
                    Draw::Restore => {
                        depth -= 1;
                        assert!(depth >= 0);
                    }
                    Draw::Layer { .. } | Draw::WindowLayer { .. } | Draw::VectorLayer { .. } => {
                        layers += 1
                    }
                    Draw::EndLayer => {
                        layers -= 1;
                        assert!(layers >= 0);
                    }
                    _ => {}
                }
            }
            assert_eq!((depth, layers), (0, 0), "{theme:?} at {time}");
        }
    }
}

#[test]
fn every_extracted_community_brush_dependency_resolves_in_all_themes() {
    let contract: Value =
        serde_json::from_str(include_str!("../references/table-view-runtime.json")).unwrap();
    let mut missing = vec![];
    for (name, theme) in [
        ("Light", Theme::Light),
        ("Dark", Theme::Dark),
        ("HighContrast", Theme::HighContrast),
    ] {
        for (key, value) in contract["themes"][name].as_object().unwrap() {
            if value.get("resource").is_some() || value.get("color").is_some() {
                if winui_wasm::resources::Resources::current()
                    .resolve(theme, key)
                    .is_err()
                {
                    missing.push(format!("{name}/{key}: {value}"));
                }
            }
        }
    }
    assert!(missing.is_empty(), "{}", missing.join("\n"));
}

#[test]
fn native_reset_entrance_uses_the_sample_apps_measured_667_ms_track() {
    let (mut s, id) = scene(6);
    s.reduced_motion = false;
    drive(
        &mut s,
        id,
        "sort",
        json!({"column":"age","direction":"Descending"}),
    );
    resolve(&mut s, id, false, json!({}));
    let first = state(&mut s, id)["motion"].clone();
    assert_eq!(first["bodyOpacity"], 0.);
    assert_eq!(first["bodyOffsetY"], 28.);
    s.advance(125.);
    let sample = state(&mut s, id)["motion"].clone();
    assert!(
        sample["bodyOpacity"].as_f64().unwrap() > 0.4
            && sample["bodyOpacity"].as_f64().unwrap() < 0.8
    );
    assert!(sample["bodyOffsetY"].as_f64().unwrap() > 0.);
    s.advance(667.);
    let end = state(&mut s, id)["motion"].clone();
    assert_eq!(end["bodyOpacity"], 1.);
    assert_eq!(end["bodyOffsetY"], 0.);
}

#[test]
fn native_drag_selection_scrolls_at_the_edge_and_stops_on_release() {
    let (mut s, id) = scene(1000);
    let snap = state(&mut s, id);
    let part = snap["realized"]
        .as_array()
        .unwrap()
        .iter()
        .find(|p| p["row"] == "r0" && p["column"] == "name")
        .unwrap()["id"]
        .as_u64()
        .unwrap() as u32;
    let node = s.get(part).unwrap();
    let (x, y) = node.world.point(30., 20.);
    s.input(Input::Down { x, y, pointer: 1 }, 0.).unwrap();
    s.input(
        Input::Move {
            x,
            y: 400.,
            pointer: 1,
        },
        1.,
    )
    .unwrap();
    for now in (17..=161).step_by(16) {
        s.advance(now as f64);
        s.layout(&mut Measure);
    }
    let offset = state(&mut s, id)["scroll"]["verticalOffset"]
        .as_f64()
        .unwrap();
    assert!(offset >= 100.);
    assert!(state(&mut s, id)["selectedCells"].as_array().unwrap().len() > 3);
    s.input(
        Input::Up {
            x,
            y: 400.,
            pointer: 1,
        },
        162.,
    )
    .unwrap();
    s.advance(500.);
    s.layout(&mut Measure);
    assert_eq!(state(&mut s, id)["scroll"]["verticalOffset"], offset);
}

#[test]
fn native_navigation_wraps_and_cancelled_commit_prevents_continuation() {
    let (mut s, id) = scene(3);
    drive(
        &mut s,
        id,
        "select",
        json!({"cell":{"row":"r2","column":"name"}}),
    );
    s.input(
        Input::KeyDown {
            key: "Enter".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    s.layout(&mut Measure);
    assert_eq!(
        state(&mut s, id)["currentCell"],
        json!({"row":"r0","column":"age"})
    );
    s.input(
        Input::KeyDown {
            key: "F2".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    resolve(&mut s, id, false, json!({}));
    s.input(
        Input::KeyDown {
            key: "Tab".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    resolve(&mut s, id, true, json!({}));
    assert_eq!(
        state(&mut s, id)["editingCell"],
        json!({"row":"r0","column":"age"})
    );
    s.input(
        Input::KeyDown {
            key: "Tab".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    resolve(&mut s, id, false, json!({"value":42}));
    // Preparing the next editor is another cancellable BeginningEdit request.
    resolve(&mut s, id, false, json!({}));
    assert_eq!(
        state(&mut s, id)["editingCell"],
        json!({"row":"r0","column":"group"})
    );
    assert_eq!(
        s.get(id).unwrap().props.table.as_ref().unwrap().items[0].values["age"],
        42
    );
}

#[test]
fn native_resource_contract_drives_default_geometry_and_grid_brushes() {
    let (mut s, id) = scene(3);
    let snap = state(&mut s, id);
    let cell = snap["realized"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["row"] == "r0" && c["column"] == "name")
        .unwrap();
    let node = s.get(cell["id"].as_u64().unwrap() as u32).unwrap();
    assert!((node.world.0[4] - s.get(id).unwrap().world.0[4] - 17.6).abs() < 0.01);
    assert!((node.world.0[5] - s.get(id).unwrap().world.0[5] - 32.8).abs() < 0.01);
    // The hidden native selection border still constrains generated content.
    assert!((node.props.padding[0] - 14.4).abs() < 0.01);
    let q = s.get(id).unwrap().props.table.as_ref().unwrap();
    assert_eq!(q.grid_lines_visibility, TableViewGridLinesVisibility::All);
    assert_eq!(
        q.row_details_visibility_mode,
        TableViewRowDetailsVisibilityMode::VisibleWhenExpanded
    );
    assert!(!q.show_filter_items_count);
    assert!(!q.are_row_details_frozen);
}

#[test]
fn auto_columns_preserve_the_submitted_business_field_order() {
    let props:TableProperties=serde_json::from_value(json!({"items":[{"id":"a","fields":["id","name","age"],"values":{"id":"a","name":"Ada","age":35}}]})).unwrap();
    assert_eq!(
        columns(&props)
            .iter()
            .map(|c| c.key.as_str())
            .collect::<Vec<_>>(),
        vec!["name", "age"]
    );
}

#[test]
fn multiple_selection_toggles_without_ctrl_and_cell_with_row_tracks_all_rows() {
    let (mut s, id) = scene(5);
    s.update(vec![Update {
        id,
        patch: json!({"table":{"selectionMode":"Multiple","selectionUnit":"CellWithRow"}}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    drive(
        &mut s,
        id,
        "select",
        json!({"cell":{"row":"r0","column":"name"}}),
    );
    drive(
        &mut s,
        id,
        "select",
        json!({"cell":{"row":"r1","column":"name"}}),
    );
    assert_eq!(state(&mut s, id)["selectedKeys"], json!(["r0", "r1"]));
    drive(
        &mut s,
        id,
        "select",
        json!({"cell":{"row":"r0","column":"name"}}),
    );
    assert_eq!(state(&mut s, id)["selectedKeys"], json!(["r1"]));
    drive(&mut s, id, "clearSelection", json!({}));
    assert!(state(&mut s, id)["selectedCells"]
        .as_array()
        .unwrap()
        .is_empty());
}

#[test]
fn selection_events_capture_keys_and_disabled_controls_can_still_export() {
    let (mut s, id) = scene(5);
    drive(
        &mut s,
        id,
        "select",
        json!({"cell":{"row":"r0","column":"name"}}),
    );
    let selected = s
        .events
        .iter()
        .find(|e| e.kind == EventKind::SelectionChanged)
        .unwrap()
        .payload
        .clone()
        .unwrap();
    drive(
        &mut s,
        id,
        "select",
        json!({"cell":{"row":"r1","column":"name"}}),
    );
    assert_eq!(selected["table"]["selectedCells"][0]["row"], "r0");
    s.update(vec![Update {
        id,
        patch: json!({"enabled":false}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    drive(
        &mut s,
        id,
        "export",
        json!({"clientOperation":7,"includeHeaders":true}),
    );
    resolve(&mut s, id, false, json!({}));
    assert!(s.events.iter().any(|e| e.kind == EventKind::TableViewExport
        && e.payload
            .as_ref()
            .is_some_and(|p| p["table"]["ready"] == true)));
}

#[test]
fn quoted_tsv_and_csv_paste_round_trip_delimiters_newlines_and_quotes() {
    use winui_wasm::scene::table_view::parse_clipboard;
    assert_eq!(
        parse_clipboard("\"a,b\",\"line 1\nline 2\",\"a\"\"b\"\r\n").unwrap(),
        vec![vec!["a,b", "line 1\nline 2", "a\"b"]]
    );
    assert_eq!(
        parse_clipboard("\"a\tb\"\t\"\"\r\nx\ty").unwrap(),
        vec![vec!["a\tb", ""], vec!["x", "y"]]
    );
    assert!(parse_clipboard("\"unclosed").is_err());
}

#[test]
fn paste_requests_can_cancel_replace_text_and_report_errors_without_mutation() {
    let (mut s, id) = scene(5);
    drive(
        &mut s,
        id,
        "select",
        json!({"cell":{"row":"r0","column":"name"}}),
    );
    drive(
        &mut s,
        id,
        "requestPaste",
        json!({"text":"Changed\t3","clientOperation":41}),
    );
    resolve(&mut s, id, true, json!({}));
    assert_eq!(
        s.get(id).unwrap().props.table.as_ref().unwrap().items[0].values["name"],
        "Name 0"
    );
    drive(
        &mut s,
        id,
        "requestPaste",
        json!({"text":"Changed\t3","clientOperation":42}),
    );
    resolve(&mut s, id, false, json!({"text":"\"Quoted, name\",35"}));
    assert_eq!(
        s.get(id).unwrap().props.table.as_ref().unwrap().items[0].values["name"],
        "Quoted, name"
    );
    assert_eq!(
        s.get(id).unwrap().props.table.as_ref().unwrap().items[0].values["age"].as_f64(),
        Some(35.)
    );
    assert!(s
        .events
        .iter()
        .any(|e| e.kind == EventKind::PasteFromClipboard
            && e.payload.as_ref().is_some_and(
                |p| p["table"]["ready"] == true && p["table"]["clientOperation"] == 42
            )));
    drive(
        &mut s,
        id,
        "requestPaste",
        json!({"text":"Invalid\tinvalid","clientOperation":43}),
    );
    resolve(&mut s, id, false, json!({}));
    assert_eq!(
        s.get(id).unwrap().props.table.as_ref().unwrap().items[0].values["name"],
        "Quoted, name"
    );
    assert!(s
        .events
        .iter()
        .any(|e| e.kind == EventKind::PasteFromClipboard
            && e.payload
                .as_ref()
                .is_some_and(|p| p["table"]["error"].is_string())));
}

#[test]
fn high_cardinality_filter_values_are_virtualized() {
    let (mut s, id) = scene(10000);
    drive(&mut s, id, "openFilter", json!({"column":"name"}));
    s.layout(&mut Measure);
    let list = s
        .nodes
        .values()
        .find(|n| {
            n.kind == NodeKind::ListView
                && n.props.accessible_name.as_deref() == Some("Filter values")
        })
        .unwrap();
    assert_eq!(list.props.collection_items.len(), 10000);
    assert!(
        s.nodes.len() < 350,
        "filter choices must not create one node per distinct value"
    );
    s.destroy(id).unwrap();
    assert_eq!(s.nodes.len(), 1);
}

#[test]
fn touch_tap_selects_but_touch_pan_does_not_select_a_cell() {
    let (mut s, id) = scene(20);
    let snap = state(&mut s, id);
    let slot = snap["realized"]
        .as_array()
        .unwrap()
        .iter()
        .find(|r| r["row"] == "r0" && r["column"] == "name")
        .unwrap()["id"]
        .as_u64()
        .unwrap() as u32;
    let n = s.get(slot).unwrap();
    let (x, y) = n.world.point(n.rect.width / 2., n.rect.height / 2.);
    for (phase, dy, time) in [("down", 0., 0.), ("move", -30., 30.), ("up", -30., 60.)] {
        s.input(
            Input::Touch {
                pointer: 3,
                x,
                y: y + dy,
                phase: phase.into(),
            },
            time,
        )
        .unwrap();
        s.layout(&mut Measure);
    }
    assert!(s
        .get(id)
        .unwrap()
        .props
        .table
        .as_ref()
        .unwrap()
        .current_cell
        .is_none());
    s.input(
        Input::Touch {
            pointer: 4,
            x,
            y,
            phase: "down".into(),
        },
        100.,
    )
    .unwrap();
    s.layout(&mut Measure);
    s.input(
        Input::Touch {
            pointer: 4,
            x,
            y,
            phase: "up".into(),
        },
        120.,
    )
    .unwrap();
    s.layout(&mut Measure);
    assert!(s
        .get(id)
        .unwrap()
        .props
        .table
        .as_ref()
        .unwrap()
        .current_cell
        .is_some());
}

#[test]
fn property_patches_retain_the_business_source_and_reject_a_null_table() {
    let (mut s, id) = scene(100);
    let source = s
        .get(id)
        .unwrap()
        .props
        .table
        .as_ref()
        .unwrap()
        .items
        .clone();
    s.update(vec![Update {
        id,
        patch: json!({"table":{"rowHeight":32}}),
    }])
    .unwrap();
    assert!(std::sync::Arc::ptr_eq(
        &source,
        &s.get(id).unwrap().props.table.as_ref().unwrap().items
    ));
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"table":null})
        }])
        .is_err());
}

#[test]
fn pointer_hits_native_cell_slots_and_double_click_requests_edit() {
    let (mut s, id) = scene(5);
    let snap = state(&mut s, id);
    let slot = snap["realized"]
        .as_array()
        .unwrap()
        .iter()
        .find(|r| r["row"] == "r0" && r["column"] == "name")
        .unwrap()["id"]
        .as_u64()
        .unwrap() as u32;
    let n = s.get(slot).unwrap();
    let (x, y) = n.world.point(n.rect.width / 2., n.rect.height / 2.);
    for time in [10., 100.] {
        s.input(Input::Down { x, y, pointer: 1 }, time).unwrap();
        s.layout(&mut Measure);
        s.input(Input::Up { x, y, pointer: 1 }, time + 10.).unwrap();
        s.layout(&mut Measure);
    }
    assert_eq!(
        s.get(id)
            .unwrap()
            .props
            .table
            .as_ref()
            .unwrap()
            .current_cell
            .as_ref()
            .unwrap()
            .row,
        "r0"
    );
    assert!(s
        .events
        .iter()
        .any(|e| e.target == id && e.kind == EventKind::BeginningEdit));
}

#[test]
fn hidden_columns_survive_resize_and_reorder() {
    let (mut s, id) = scene(5);
    s.update(vec![Update{id,patch:json!({"table":{"columns":[{"key":"name","field":"name"},{"key":"hidden","field":"group","visible":false},{"key":"age","field":"age"}]}})}]).unwrap();
    s.layout(&mut Measure);
    drive(
        &mut s,
        id,
        "resizeColumn",
        json!({"column":"name","width":180}),
    );
    drive(&mut s, id, "reorderColumn", json!({"from":0,"to":1}));
    resolve(&mut s, id, false, json!({}));
    let cols = &s.get(id).unwrap().props.table.as_ref().unwrap().columns;
    assert_eq!(cols.len(), 3);
    assert_eq!(cols[1].key, "hidden");
    assert!(!cols[1].visible);
    assert_eq!(cols[2].key, "name");
}
#[test]
fn request_queue_preserves_programmatic_sort_sequences() {
    let (mut s, id) = scene(5);
    drive(
        &mut s,
        id,
        "sort",
        json!({"column":"age","direction":"Descending"}),
    );
    drive(
        &mut s,
        id,
        "sort",
        json!({"column":"name","direction":"Ascending","additive":true}),
    );
    resolve(&mut s, id, false, json!({}));
    resolve(&mut s, id, false, json!({}));
    let snap = state(&mut s, id);
    assert_eq!(snap["sorts"].as_array().unwrap().len(), 2);
    assert_eq!(snap["sorts"][0]["column"], "age");
    assert_eq!(snap["sorts"][1]["column"], "name");
}
#[test]
fn all_typed_editors_build_and_readonly_cancels_live_edit() {
    let mut s = Scene::new(Theme::Dark, true);
    s.resize(1000., 400., 1.).unwrap();
    let id=s.create(s.root,NodeKind::TableView,json!({"table":{"autoGenerateColumns":false,"items":[{"id":"a","values":{"name":"Ada","number":35,"check":true,"toggle":false,"choice":"A","date":"2024-01-02","time":600}}],"columns":[{"key":"name","field":"name"},{"key":"number","field":"number","kind":"Number"},{"key":"check","field":"check","kind":"CheckBox"},{"key":"toggle","field":"toggle","kind":"ToggleSwitch"},{"key":"choice","field":"choice","kind":"ComboBox","options":["A","B"]},{"key":"date","field":"date","kind":"Date"},{"key":"time","field":"time","kind":"Time"}]}})).unwrap();
    s.layout(&mut Measure);
    for switch in s
        .nodes
        .values()
        .filter(|n| n.kind == NodeKind::ToggleSwitch)
    {
        assert!(
            switch.props.on_content.is_empty() && switch.props.off_content.is_empty(),
            "Community TableViewToggleSwitchColumn has null OnContent/OffContent defaults"
        );
    }
    for key in [
        "name", "number", "check", "toggle", "choice", "date", "time",
    ] {
        drive(
            &mut s,
            id,
            "beginEdit",
            json!({"cell":{"row":"a","column":key}}),
        );
        resolve(&mut s, id, false, json!({}));
        assert_eq!(state(&mut s, id)["editingCell"]["column"], key);
        if key == "number" {
            let editor = s
                .nodes
                .values()
                .find(|n| n.kind == NodeKind::NumberBox)
                .unwrap();
            assert_eq!(
                editor.props.horizontal_alignment,
                HorizontalAlignment::Stretch
            );
            let cell=&s.nodes[&editor.parent.unwrap()];
            let available=cell.rect.width-cell.props.padding[0]-cell.props.padding[2];
            assert!((editor.rect.width-available).abs()<1e-6,"The numeric editor must fill its constrained cell: {} vs {}",editor.rect.width,available);
            let input = &s.nodes[&s.focused.unwrap()];
            assert_eq!(input.kind, NodeKind::TextBox);
            assert_eq!(
                input.props.selection_length, 2,
                "NumberBox selects its value when focus enters the inner editor"
            );
        }
        drive(&mut s, id, "cancelEdit", json!({}));
        resolve(&mut s, id, false, json!({}));
    }
    drive(
        &mut s,
        id,
        "beginEdit",
        json!({"cell":{"row":"a","column":"name"}}),
    );
    resolve(&mut s, id, false, json!({}));
    s.update(vec![Update {
        id,
        patch: json!({"table":{"isReadOnly":true}}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert!(state(&mut s, id)["editingCell"].is_null());
}
impl TextMeasurer for Measure {
    fn measure(&mut self, s: &str, f: &Font) -> Metrics {
        Metrics {
            width: s.chars().count() as f64 * f.size * 0.5,
            ascent: f.size,
            descent: 4.,
            ..Default::default()
        }
    }
}
fn source(count: usize) -> Value {
    json!((0..count).map(|i|json!({"id":format!("r{i}"),"values":{"id":format!("r{i}"),"name":format!("Name {i}"),"age":i,"group":if i%2==0{"A"}else{"B"}}})).collect::<Vec<_>>())
}
fn scene(count: usize) -> (Scene, u32) {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(640., 360., 1.25).unwrap();
    let id=s.create(s.root,NodeKind::TableView,json!({"height":320,"table":{"items":source(count),"autoGenerateColumns":false,"columns":[{"key":"name","field":"name","header":"Name","width":{"unit":"Pixel","value":200}},{"key":"age","field":"age","kind":"Number","width":{"unit":"Pixel","value":120}},{"key":"group","field":"group","width":{"unit":"Pixel","value":180}}]}})).unwrap();
    s.layout(&mut Measure);
    (s, id)
}
#[test]
fn touch_group_buttons_expand_and_collapse_without_selecting_cells() {
    let(mut s,id)=scene(20);
    s.update(vec![Update{id,patch:json!({"table":{"groups":[{"column":"group"}],"defaultGroupState":"Expanded"}})}]).unwrap();
    s.layout(&mut Measure);
    for(label,count)in [("Collapse group: A",10),("Expand group: A",20)] {
        let button=s.nodes.values().find(|n|n.props.accessible_name.as_deref()==Some(label)).unwrap();
        let(x,y)=button.world.point(button.rect.width/2.,button.rect.height/2.);
        for phase in ["down","up"] {s.input(Input::Touch{pointer:17,x,y,phase:phase.into()},s.time+20.).unwrap();s.layout(&mut Measure);}
        let table=state(&mut s,id);assert_eq!(table["viewKeys"].as_array().unwrap().len(),count);
        assert!(table["currentCell"].is_null());
    }
}
fn drive(s: &mut Scene, id: u32, action: &str, data: Value) {
    s.input(
        serde_json::from_value::<Input>(
            json!({"kind":"table","id":id,"action":action,"data":data}),
        )
        .unwrap(),
        s.time,
    )
    .unwrap();
    s.layout(&mut Measure);
}
fn state(s: &mut Scene, id: u32) -> Value {
    serde_json::to_value(s.snapshot()).unwrap()["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == id)
        .unwrap()["table"]
        .clone()
}
fn resolve(s: &mut Scene, id: u32, cancel: bool, data: Value) {
    let event = s
        .events
        .iter()
        .rev()
        .find(|e| e.target == id && e.request_id.is_some())
        .unwrap()
        .clone();
    s.input(serde_json::from_value::<Input>(json!({"kind":"table","id":id,"action":"resolve","request":event.request_id,"cancel":cancel,"data":data})).unwrap(),s.time).unwrap();
    if event.kind == EventKind::Sorting && !cancel {
        let clear = s
            .events
            .iter()
            .rev()
            .find(|e| e.target == id && e.kind == EventKind::ClearSorting && e.request_id.is_some())
            .unwrap()
            .clone();
        s.input(serde_json::from_value::<Input>(json!({"kind":"table","id":id,"action":"resolve","request":clear.request_id,"cancel":false,"data":{}})).unwrap(),s.time).unwrap();
    }
    s.layout(&mut Measure);
}
#[test]
fn data_view_preserves_numeric_order_and_intersects_filters() {
    let p:TableProperties=serde_json::from_value(json!({"items":source(14),"sorts":[{"column":"age","direction":"Descending"}],"filters":[{"column":"group","values":["A"]}]})).unwrap();
    let c = columns(&p);
    let v = view(&p, &c);
    assert_eq!(v, vec![12, 10, 8, 6, 4, 2, 0]);
}
#[test]
fn csv_escapes_quotes_newlines_and_respects_sparse_cells() {
    let p:TableProperties=serde_json::from_value(json!({"items":[{"id":"1","values":{"a":"a,\"b\"\nc","b":7}}],"autoGenerateColumns":false,"columns":[{"key":"a","field":"a","header":"A"},{"key":"b","field":"b","header":"B"}],"selectedCells":[{"row":"1","column":"a"}]})).unwrap();
    assert_eq!(
        csv(&p, &columns(&p), &[0], true, true, ','),
        "A\r\n\"a,\"\"b\"\"\nc\""
    );
}
#[test]
fn ten_thousand_rows_realize_a_bounded_viewport_and_destroy_cleanly() {
    let (mut s, id) = scene(10000);
    drive(&mut s, id, "selectAll", json!({}));
    let snap = state(&mut s, id);
    assert_eq!(snap["totalCount"], 10000);
    assert_eq!(snap["selectedKeys"].as_array().unwrap().len(), 10000);
    assert!(snap["realized"].as_array().unwrap().len() < 60);
    assert!(s.nodes.len() < 180);
    drive(&mut s, id, "scrollIntoView", json!({"row":"r9999"}));
    s.layout(&mut Measure);
    let snap = state(&mut s, id);
    assert!(snap["realized"]
        .as_array()
        .unwrap()
        .iter()
        .any(|r| r["row"] == "r9999"));
    assert!(s.nodes.len() < 180);
    s.destroy(id).unwrap();
    assert_eq!(s.nodes.len(), 1);
}
#[test]
fn sorting_is_a_cancellable_transaction() {
    let (mut s, id) = scene(12);
    drive(
        &mut s,
        id,
        "sort",
        json!({"column":"age","direction":"Descending"}),
    );
    resolve(&mut s, id, true, json!({}));
    assert_eq!(state(&mut s, id)["viewKeys"][0], "r0");
    drive(
        &mut s,
        id,
        "sort",
        json!({"column":"age","direction":"Descending"}),
    );
    resolve(&mut s, id, false, json!({}));
    assert_eq!(state(&mut s, id)["viewKeys"][0], "r11");
}
#[test]
fn applying_a_filter_deselects_cells_as_in_the_community_source() {
    let (mut s, id) = scene(12);
    drive(
        &mut s,
        id,
        "select",
        json!({"cell":{"row":"r4","column":"age"}}),
    );
    drive(
        &mut s,
        id,
        "filter",
        json!({"column":"group","values":["B"]}),
    );
    let snap = state(&mut s, id);
    assert_eq!(snap["filteredCount"], 6);
    // ColumnFilterHandler.ApplyFilter -> TableView.DeselectAll (source contract).
    assert_eq!(snap["selectedCells"], json!([]));
    assert!(snap["currentCell"].is_null());
    assert!(!snap["viewKeys"].as_array().unwrap().contains(&json!("r4")));
}
#[test]
fn editor_commit_cancel_and_readonly_guards() {
    let (mut s, id) = scene(6);
    let cell = json!({"row":"r0","column":"age"});
    drive(&mut s, id, "beginEdit", json!({"cell":cell}));
    resolve(&mut s, id, true, json!({}));
    assert!(state(&mut s, id)["editingCell"].is_null());
    drive(&mut s, id, "beginEdit", json!({"cell":cell}));
    resolve(&mut s, id, false, json!({}));
    assert_eq!(state(&mut s, id)["editingCell"], cell);
    drive(&mut s, id, "commitEdit", json!({"value":35}));
    resolve(&mut s, id, false, json!({"value":35}));
    assert_eq!(
        s.get(id).unwrap().props.table.as_ref().unwrap().items[0].values["age"],
        35
    );
    drive(&mut s, id, "beginEdit", json!({"cell":cell}));
    resolve(&mut s, id, false, json!({}));
    drive(&mut s, id, "cancelEdit", json!({}));
    resolve(&mut s, id, false, json!({}));
    assert_eq!(
        s.get(id).unwrap().props.table.as_ref().unwrap().items[0].values["age"],
        35
    );
}
#[test]
fn paste_is_atomic_on_invalid_number() {
    let (mut s, id) = scene(6);
    drive(
        &mut s,
        id,
        "select",
        json!({"cell":{"row":"r0","column":"name"}}),
    );
    let before = s
        .get(id)
        .unwrap()
        .props
        .table
        .as_ref()
        .unwrap()
        .items
        .clone();
    let input = serde_json::from_value(
        json!({"kind":"table","id":id,"action":"paste","data":{"text":"Changed\tinvalid"}}),
    )
    .unwrap();
    assert!(s.input(input, 0.).is_err());
    assert_eq!(
        s.get(id).unwrap().props.table.as_ref().unwrap().items[0].values,
        before[0].values
    );
}
#[test]
fn source_replacement_removes_stale_selections_and_pages_in_rust() {
    let (mut s, id) = scene(100);
    drive(
        &mut s,
        id,
        "select",
        json!({"cell":{"row":"r90","column":"name"}}),
    );
    s.update(vec![Update {
        id,
        patch: json!({"table":{"items":source(20),"pageSize":5,"pageIndex":2}}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    let snap = state(&mut s, id);
    assert_eq!(snap["viewKeys"], json!(["r10", "r11", "r12", "r13", "r14"]));
    assert!(snap["selectedCells"].as_array().unwrap().is_empty());
    assert_eq!(snap["pageCount"], 4);
}
#[test]
fn duplicate_ids_and_invalid_widths_fail_before_mutating_scene() {
    let (mut s, id) = scene(6);
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"table":{"items":[{"id":"x","values":{}},{"id":"x","values":{}}]}})
        }])
        .is_err());
    assert_eq!(
        s.get(id).unwrap().props.table.as_ref().unwrap().items.len(),
        6
    );
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"table":{"rowHeight":0}})
        }])
        .is_err());
}
#[test]
fn frozen_column_uses_scroll_compensation_and_header_stays_fixed() {
    let (mut s, id) = scene(20);
    s.update(vec![Update {
        id,
        patch: json!({"width":320,"table":{"frozenColumnCount":1}}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    let body = s
        .get(id)
        .unwrap()
        .children
        .iter()
        .copied()
        .find(|c| s.get(*c).unwrap().kind == NodeKind::ScrollViewer)
        .unwrap();
    s.input(
        Input::Scroll {
            id: body,
            x: Some(140.),
            y: Some(70.),
            zoom: None,
            animated: false,
        },
        0.,
    )
    .unwrap();
    s.layout(&mut Measure);
    let snap = state(&mut s, id);
    let first = snap["realized"]
        .as_array()
        .unwrap()
        .iter()
        .find(|s| s["column"] == "name")
        .unwrap()["id"]
        .as_u64()
        .unwrap() as u32;
    let x = s.get(first).unwrap().world.0[4];
    assert!(
        // Native row-header minimum 16 plus its rounded vertical grid line.
        (x - s.get(id).unwrap().world.0[4] - 17.6).abs() < 1.,
        "x={x}, root={:?}, cell={:?}, snap={snap}",
        s.get(id).unwrap().world,
        s.get(first).unwrap().props.canvas_left
    );
    assert!(snap["scroll"]["verticalOffset"].as_f64().unwrap() > 0.);
}

#[test]
fn released_groups_default_collapsed_count_ties_and_multilevel_paths() {
 let (mut s,id)=scene(24);
 s.update(vec![Update{id,patch:json!({"table":{"groups":[{"column":"group","sortMode":"Count","direction":"Descending"}]}})}]).unwrap();s.layout(&mut Measure);
 let a=state(&mut s,id);assert_eq!(a["viewKeys"],json!([]));assert_eq!(a["realizedGroups"][0]["key"],"A");assert_eq!(a["realizedGroups"][0]["count"],12);assert_eq!(a["groupCount"],2);
 drive(&mut s,id,"expandGroup",json!({"path":["A"]}));let a=state(&mut s,id);assert_eq!(a["viewKeys"].as_array().unwrap().len(),12);
 drive(&mut s,id,"select",json!({"cell":{"row":"r0","column":"name"}}));
 drive(&mut s,id,"collapseGroup",json!({"path":["A"]}));assert!(state(&mut s,id)["currentCell"].is_null());
 s.update(vec![Update{id,patch:json!({"table":{"groups":[{"column":"group"},{"column":"age"}],"defaultGroupState":"Expanded"}})}]).unwrap();s.layout(&mut Measure);
 assert_eq!(state(&mut s,id)["groupCount"],14,"Adding a level preserves an existing parent collapse");drive(&mut s,id,"expandGroup",json!({"path":["A"]}));let a=state(&mut s,id);assert!(a["groupCount"].as_u64().unwrap()>=26);let groups=a["realizedGroups"].as_array().unwrap();assert!(groups.iter().any(|g|g["level"]==1&&g["path"]==json!(["A",0])));
 drive(&mut s,id,"collapseGroup",json!({"path":["A",0]}));assert!(!state(&mut s,id)["viewKeys"].as_array().unwrap().contains(&json!("r0")));
 drive(&mut s,id,"collapseAllGroups",json!({}));assert_eq!(state(&mut s,id)["viewKeys"],json!([]));
 drive(&mut s,id,"expandAllGroups",json!({}));assert_eq!(state(&mut s,id)["viewKeys"].as_array().unwrap().len(),24);
}
#[test]
fn column_group_request_is_cancellable_and_group_sorts_have_two_states() {
 let (mut s,id)=scene(12);drive(&mut s,id,"group",json!({"column":"group"}));assert_eq!(s.events.last().unwrap().kind,EventKind::Grouping);resolve(&mut s,id,true,json!({}));assert_eq!(state(&mut s,id)["isGrouped"],false);
 drive(&mut s,id,"group",json!({"column":"group"}));resolve(&mut s,id,false,json!({}));assert_eq!(state(&mut s,id)["isGrouped"],true);
 for direction in ["Descending","Ascending","Descending"] {drive(&mut s,id,"sort",json!({"column":"group"}));resolve(&mut s,id,false,json!({}));assert_eq!(state(&mut s,id)["groups"][0]["direction"],direction);assert_eq!(state(&mut s,id)["sorts"],json!([]));}
 drive(&mut s,id,"ungroupAll",json!({}));assert_eq!(state(&mut s,id)["viewKeys"].as_array().unwrap().len(),12);
}
#[test]
fn group_headers_virtualize_even_without_visible_rows_and_sticky_header_owns_hits() {
 let (mut s,id)=scene(10000);s.update(vec![Update{id,patch:json!({"table":{"groups":[{"column":"age"}],"areStickyGroupHeadersEnabled":true}})}]).unwrap();s.layout(&mut Measure);
 let a=state(&mut s,id);assert_eq!(a["groupCount"],10000);assert!(a["realizedGroups"].as_array().unwrap().len()<15);assert!(s.nodes.len()<90);
 let body=s.nodes.values().find(|n|n.props.accessible_name.as_deref()==Some("Table rows")).unwrap().id;
 s.input(Input::Scroll{id:body,x:None,y:Some(358000.),zoom:None,animated:false},0.).unwrap();s.layout(&mut Measure);
 let a=state(&mut s,id);assert!(a["realizedGroups"].as_array().unwrap().iter().all(|g|g["key"].as_u64().unwrap()>9900));assert!(s.nodes.len()<90);
 drive(&mut s,id,"expandAllGroups",json!({}));s.input(Input::Scroll{id:body,x:None,y:Some(100.),zoom:None,animated:false},0.).unwrap();s.layout(&mut Measure);
 assert!(state(&mut s,id)["realized"].as_array().unwrap().len()<50);
 let button=s.nodes.values().find(|n|n.props.accessible_name.as_deref()==Some("Collapse age: 1")).unwrap().id;
 let p=s.nodes[&button].world.point(12.,12.);for input in [Input::Down{x:p.0,y:p.1,pointer:1},Input::Up{x:p.0,y:p.1,pointer:1}]{s.input(input,0.).unwrap();s.layout(&mut Measure);}
 assert!(!state(&mut s,id)["viewKeys"].as_array().unwrap().contains(&json!("r1")));
 assert!(s.nodes.len()<150);s.display_list();
}

#[test]
fn grouped_scroll_reuses_measures_and_retained_rows_between_realization_boundaries() {
 struct Count(usize);impl TextMeasurer for Count{fn measure(&mut self,s:&str,f:&Font)->Metrics{self.0+=1;Measure.measure(s,f)}}
 let(mut s,id)=scene(10000);s.update(vec![Update{id,patch:json!({"table":{"groups":[{"column":"group"}],"defaultGroupState":"Expanded","areStickyGroupHeadersEnabled":true}})}]).unwrap();s.layout(&mut Measure);
 let body=s.nodes.values().find(|n|n.props.accessible_name.as_deref()==Some("Table rows")).unwrap().id;
 s.input(Input::Scroll{id:body,x:None,y:Some(90.),zoom:None,animated:false},0.).unwrap();s.layout(&mut Measure);let before=s.display_list();
 let mut count=Count(0);s.input(Input::Scroll{id:body,x:None,y:Some(90.4),zoom:None,animated:false},0.).unwrap();s.layout(&mut count);assert_eq!(count.0,0,"Fractional grouped scrolling must not measure unchanged cells or headers");
 let after=s.display_list();let retained=|list:Vec<winui_wasm::render::Draw>|list.into_iter().find_map(|d|if let winui_wasm::render::Draw::RetainedGroup{commands,..}=d{Some(commands)}else{None}).unwrap();assert!(std::sync::Arc::ptr_eq(&retained(before),&retained(after)));
 let cached=s.display_list();s.invalidate(id,true);s.layout(&mut Measure);let fresh=s.display_list();let a=winui_wasm::render::expand_retained(&cached);let b=winui_wasm::render::expand_retained(&fresh);assert_eq!(a.len(),b.len());for(i,(a,b))in a.iter().zip(b.iter()).enumerate(){fn near(a:&Value,b:&Value)->bool {match(a,b){(Value::Number(a),Value::Number(b))=>(a.as_f64().unwrap()-b.as_f64().unwrap()).abs()<1e-8,(Value::Array(a),Value::Array(b))=>a.len()==b.len()&&a.iter().zip(b).all(|(a,b)|near(a,b)),(Value::Object(a),Value::Object(b))=>a.len()==b.len()&&a.iter().all(|(k,a)|b.get(k).is_some_and(|b|near(a,b))),_=>a==b}}assert!(near(&serde_json::to_value(a).unwrap(),&serde_json::to_value(b).unwrap()),"First changed command {i}: {a:?} vs {b:?}");}
}

#[test]
fn grouping_custom_bindings_all_themes_export_visible_rows_and_keyboard_toggle() {
 for theme in [Theme::Light,Theme::Dark,Theme::HighContrast] {
  let (mut s,id)=scene(8);s.theme=theme;s.invalidate(s.root,true);s.update(vec![Update{id,patch:json!({"table":{"groups":[{"column":"group","comparisonRanks":{"\"B\"":0,"\"A\"":1}}]}})}]).unwrap();s.layout(&mut Measure);s.display_list();
  let a=state(&mut s,id);assert_eq!(a["realizedGroups"][0]["key"],"B");assert!(a["groups"][0].get("comparisonRanks").is_none());
  let button=s.nodes.values().find(|n|n.props.accessible_name.as_deref()==Some("Expand group: B")).unwrap().id;s.input(serde_json::from_value(json!({"kind":"focus","id":button})).unwrap(),0.).unwrap();
  for input in [Input::KeyDown{key:"Enter".into(),repeat:false},Input::KeyUp{key:"Enter".into()}] {s.input(input,0.).unwrap();s.layout(&mut Measure);}
  assert_eq!(state(&mut s,id)["viewKeys"].as_array().unwrap().len(),4);
  drive(&mut s,id,"export",json!({}));let content=s.events.iter().rev().find(|e|e.kind==EventKind::TableViewExport).unwrap().payload.as_ref().unwrap()["table"]["text"].as_str().unwrap();assert!(content.contains("Name 1"));assert!(!content.contains("Name 0"));
 }
}

#[test]
fn activating_group_templates_keeps_a_caller_subtree_mounted_before_arrange() {
 let(mut s,id)=scene(8);s.update(vec![Update{id,patch:json!({"table":{"groups":[{"column":"group"}],"defaultGroupState":"Expanded"}})}]).unwrap();s.layout(&mut Measure);
 let slot=state(&mut s,id)["realizedGroups"][0]["container"].as_u64().unwrap() as u32;
 let text=s.create(slot,NodeKind::TextBlock,json!({"text":"Caller group template"})).unwrap();
 s.events.clear();
 s.update(vec![Update{id,patch:json!({"table":{"hasGroupHeaderTemplate":true}})}]).unwrap();s.layout(&mut Measure);
 assert!(s.events.iter().any(|event|event.target==id&&event.kind==EventKind::RealizationChanged));
 assert!(s.nodes.contains_key(&text),"Switching the native template must not destroy an already-mounted caller subtree");assert_eq!(s.nodes[&slot].children,vec![text]);
 s.update(vec![Update{id,patch:json!({"table":{"hasGroupHeaderTemplate":false}})}]).unwrap();s.layout(&mut Measure);assert!(!s.nodes.contains_key(&text));assert_eq!(s.nodes[&slot].children.len(),2);
}

#[test]
fn collapsing_at_the_end_realizes_headers_again_in_the_same_reduced_motion_frame() {
 let(mut s,id)=scene(10000);s.update(vec![Update{id,patch:json!({"table":{"groups":[{"column":"group"}],"defaultGroupState":"Expanded"}})}]).unwrap();s.layout(&mut Measure);
 drive(&mut s,id,"scrollIntoView",json!({"row":"r9999"}));drive(&mut s,id,"collapseAllGroups",json!({}));let a=state(&mut s,id);assert_eq!(a["scroll"]["verticalOffset"],0.);assert_eq!(a["realizedGroups"].as_array().unwrap().len(),2);assert_eq!(a["viewKeys"],json!([]));
}

#[test]
fn offscreen_membership_changes_refresh_realized_group_template_metadata() {
 let(mut s,id)=scene(100);s.update(vec![Update{id,patch:json!({"table":{"groups":[{"column":"group"}],"defaultGroupState":"Expanded","hasGroupHeaderTemplate":true}})}]).unwrap();s.layout(&mut Measure);s.events.clear();
 let mut items=source(100).as_array().unwrap().clone();items.push(json!({"id":"extra","values":{"name":"extra","age":100,"group":"A"}}));
 s.update(vec![Update{id,patch:json!({"table":{"items":items}})}]).unwrap();s.layout(&mut Measure);assert!(s.events.iter().any(|e|e.target==id&&e.kind==EventKind::RealizationChanged));assert_eq!(state(&mut s,id)["realizedGroups"][0]["count"],51);
}

#[test]
fn group_chevrons_render_right_when_collapsed_and_down_when_expanded() {
    fn assert_direction(scene: &Scene, name: &str, expanded: bool) {
        let button = scene.nodes.values().find(|node|
            node.props.accessible_name.as_deref() == Some(name)).unwrap();
        let icon = &scene.nodes[&button.children[0]];
        // Test the transformed glyph axes, not just its configured rotation.
        let top = icon.world.point(6., 0.);
        let bottom = icon.world.point(6., 12.);
        let actual = [bottom.0 - top.0, bottom.1 - top.1];
        let expected = if expanded { [0., 12.] } else { [12., 0.] };
        for axis in 0..2 {
            assert!((actual[axis] - expected[axis]).abs() < 1e-8,
                "{name}: rendered glyph axis {actual:?}, expected {expected:?}");
        }
    }
    let (mut scene, id) = scene(4);
    scene.update(vec![Update { id, patch: json!({"table":{"groups":[{"column":"group"}]}}) }]).unwrap();
    scene.layout(&mut Measure);
    assert_direction(&scene, "Expand group: A", false);
    assert_direction(&scene, "Expand group: B", false);
    drive(&mut scene, id, "expandAllGroups", json!({}));
    assert_direction(&scene, "Collapse group: A", true);
    assert_direction(&scene, "Collapse group: B", true);
    let button = scene.nodes.values().find(|node|
        node.props.accessible_name.as_deref() == Some("Collapse group: A")).unwrap();
    let point = button.world.point(12., 12.);
    for input in [Input::Down { x: point.0, y: point.1, pointer: 1 },
        Input::Up { x: point.0, y: point.1, pointer: 1 }] {
        scene.input(input, 0.).unwrap();
        scene.layout(&mut Measure);
    }
    assert_direction(&scene, "Expand group: A", false);
    assert_direction(&scene, "Collapse group: B", true);
    drive(&mut scene, id, "expandGroup", json!({"path":["A"]}));
    assert_direction(&scene, "Collapse group: A", true);
    drive(&mut scene, id, "collapseAllGroups", json!({}));
    assert_direction(&scene, "Expand group: A", false);
    assert_direction(&scene, "Expand group: B", false);
}
