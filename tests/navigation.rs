use serde_json::json;
use winui_wasm::{
    animation::Motion,
    model::*,
    navigation::NavigationView,
    render::{display_list, Draw},
    Runtime,
};

fn props() -> Properties {
    serde_json::from_value(json!({"items":[
    {"id":"one","text":"One"}, {"id":"two","text":"Two"},
    {"id":"disabled","text":"Disabled","enabled":false},
    {"id":"branch","text":"Branch","selectsOnInvoked":false,"children":[{"id":"child","text":"Child"}]}
],"paneDisplayMode":"Left","selectedId":"one"})).unwrap()
}
fn input(view: &mut NavigationView, input: Input) {
    view.input(input, 10.).unwrap();
}

#[test]
fn adaptive_boundaries_follow_cpp() {
    let mut p = props();
    p.pane_display_mode = PaneDisplayMode::Auto;
    let mut v = NavigationView::new(p).unwrap();
    for (width, mode) in [
        (640., DisplayMode::Minimal),
        (641., DisplayMode::Compact),
        (1007., DisplayMode::Compact),
        (1008., DisplayMode::Expanded),
    ] {
        input(
            &mut v,
            Input::Resize {
                width,
                height: 400.,
            },
        );
        assert_eq!(v.display_mode, mode);
    }
}
#[test]
fn all_five_modes_override_auto() {
    let mut v = NavigationView::new(props()).unwrap();
    for (mode, expected) in [
        ("Left", "Expanded"),
        ("LeftCompact", "Compact"),
        ("LeftMinimal", "Minimal"),
        ("Top", "Minimal"),
        ("Auto", "Compact"),
    ] {
        v.update(json!([{"paneDisplayMode":mode}])).unwrap();
        assert_eq!(serde_json::to_value(v.display_mode).unwrap(), expected);
    }
}
#[test]
fn batches_are_atomic_and_reject_unknown_properties() {
    let mut v = NavigationView::new(props()).unwrap();
    let old = v.props.header.clone();
    assert!(v
        .update(json!([{"header":"changed"},{"openPaneLength":-1}]))
        .is_err());
    assert_eq!(v.props.header, old);
    assert!(v.update(json!([{"nativeMagic":true}])).is_err());
    assert!(v.update(json!([{"selectedId":"missing"}])).is_err());
}
#[test]
fn invocation_order_and_disabled_items() {
    let mut v = NavigationView::new(props()).unwrap();
    input(&mut v, Input::Invoke { id: "two".into() });
    let s = v.snapshot();
    assert_eq!(
        s.events.iter().map(|e| e.kind.as_str()).collect::<Vec<_>>(),
        vec!["itemInvoked", "selectionChanged"]
    );
    input(
        &mut v,
        Input::Invoke {
            id: "disabled".into(),
        },
    );
    assert_eq!(v.selected.as_deref(), Some("two"));
    assert!(v.snapshot().events.is_empty());
    input(&mut v, Input::Invoke { id: "two".into() });
    assert_eq!(v.snapshot().events.len(), 1);
}
#[test]
fn closing_is_a_cancellable_handshake() {
    let mut v = NavigationView::new(props()).unwrap();
    input(
        &mut v,
        Input::Invoke {
            id: "$toggle".into(),
        },
    );
    assert!(v.pane_open);
    let request = v.snapshot().events[0].request_id.unwrap();
    input(
        &mut v,
        Input::ResolveClosing {
            request,
            cancel: true,
        },
    );
    assert!(v.pane_open);
    input(
        &mut v,
        Input::Invoke {
            id: "$toggle".into(),
        },
    );
    let request = v.snapshot().events[0].request_id.unwrap();
    input(
        &mut v,
        Input::ResolveClosing {
            request,
            cancel: false,
        },
    );
    assert!(!v.pane_open);
    assert!(v
        .input(
            Input::ResolveClosing {
                request,
                cancel: false
            },
            11.
        )
        .is_err());
}
#[test]
fn hierarchy_and_nonselecting_parent() {
    let mut v = NavigationView::new(props()).unwrap();
    input(
        &mut v,
        Input::Invoke {
            id: "branch".into(),
        },
    );
    assert_eq!(v.selected.as_deref(), Some("one"));
    assert!(v.parts.iter().any(|p| p.id == "child"));
    input(&mut v, Input::Focus { id: "child".into() });
    input(
        &mut v,
        Input::Key {
            key: "ArrowLeft".into(),
        },
    );
    assert_eq!(v.focused.as_deref(), Some("branch"));
    input(
        &mut v,
        Input::Key {
            key: "ArrowLeft".into(),
        },
    );
    assert!(!v.parts.iter().any(|p| p.id == "child"));
}
#[test]
fn focus_skips_disabled_and_selection_can_follow_focus() {
    let mut p = props();
    p.selection_follows_focus = true;
    let mut v = NavigationView::new(p).unwrap();
    input(&mut v, Input::Focus { id: "one".into() });
    input(
        &mut v,
        Input::Key {
            key: "ArrowDown".into(),
        },
    );
    assert_eq!(v.selected.as_deref(), Some("two"));
    input(
        &mut v,
        Input::Key {
            key: "ArrowDown".into(),
        },
    );
    assert_eq!(v.focused.as_deref(), Some("branch"));
}
#[test]
fn pointer_activation_requires_same_press_and_release_target() {
    let mut v = NavigationView::new(props()).unwrap();
    let a = v.parts.iter().find(|p| p.id == "one").unwrap().rect;
    let b = v.parts.iter().find(|p| p.id == "two").unwrap().rect;
    input(
        &mut v,
        Input::Down {
            x: a.x + 10.,
            y: a.y + 10.,
        },
    );
    input(
        &mut v,
        Input::Up {
            x: b.x + 10.,
            y: b.y + 10.,
        },
    );
    assert_eq!(v.selected.as_deref(), Some("one"));
    input(
        &mut v,
        Input::Down {
            x: b.x + 10.,
            y: b.y + 10.,
        },
    );
    input(&mut v, Input::Cancel);
    input(
        &mut v,
        Input::Up {
            x: b.x + 10.,
            y: b.y + 10.,
        },
    );
    assert_eq!(v.selected.as_deref(), Some("one"));
}
#[test]
fn animation_reversal_is_continuous_and_unload_drops_timeline() {
    let mut m = Motion::default();
    m.retarget(320., 0., 350.);
    let before = m.value(90.);
    m.retarget(48., 90., 120.);
    assert!((m.value(90.) - before).abs() < 0.02);
    assert!((m.value(300.) - 48.).abs() < 0.01);
    let mut runtime = Runtime::default();
    let id = runtime.create(props()).unwrap();
    runtime.destroy(id).unwrap();
    assert_eq!(runtime.live_count(), 0);
    assert!(runtime.get(id).is_err());
    assert_ne!(runtime.create(props()).unwrap(), id);
}
#[test]
fn reduced_motion_finishes_without_intermediate_frames() {
    let mut p = props();
    p.reduced_motion = true;
    let mut v = NavigationView::new(p).unwrap();
    input(
        &mut v,
        Input::Invoke {
            id: "$toggle".into(),
        },
    );
    let request = v.snapshot().events[0].request_id.unwrap();
    input(
        &mut v,
        Input::ResolveClosing {
            request,
            cancel: false,
        },
    );
    v.advance(10.);
    assert!(!v.pane_motion.active(10.));
    assert!(v
        .snapshot()
        .events
        .iter()
        .any(|e| e.kind == EventKind::PaneClosed));
}
#[test]
fn top_overflow_is_real_interactive_layout() {
    let mut p = props();
    p.pane_display_mode = PaneDisplayMode::Top;
    let mut v = NavigationView::new(p).unwrap();
    input(
        &mut v,
        Input::Resize {
            width: 280.,
            height: 400.,
        },
    );
    assert!(v.parts.iter().any(|p| p.id == "$overflow"));
    input(
        &mut v,
        Input::Invoke {
            id: "$overflow".into(),
        },
    );
    assert!(v.overflow_open);
    assert!(v.parts.iter().any(|p| p.id == "two"));
    input(&mut v, Input::Invoke { id: "two".into() });
    assert!(!v.overflow_open);
    assert_eq!(v.selected.as_deref(), Some("two"));
}
#[test]
fn theme_and_source_extracted_geometry_reach_the_display_list() {
    let mut v = NavigationView::new(props()).unwrap();
    assert_eq!(v.template.item_height, 36.);
    assert_eq!(v.template.indicator_width, 3.);
    let light = display_list(&v);
    v.update(json!([{"theme":"Dark"}])).unwrap();
    let dark = display_list(&v);
    assert_ne!(
        serde_json::to_string(&light).unwrap(),
        serde_json::to_string(&dark).unwrap()
    );
    assert!(dark
        .iter()
        .any(|cmd| matches!(cmd,Draw::Text{text,..}if text=="Two")));
}

#[test]
fn official_api_sample_allows_independent_thresholds() {
    let mut p = props();
    p.expanded_mode_threshold_width = 500.;
    let mut v = NavigationView::new(p).unwrap();
    v.update(json!([{"paneDisplayMode":"Auto"}])).unwrap();
    input(
        &mut v,
        Input::Resize {
            width: 550.,
            height: 400.,
        },
    );
    assert_eq!(v.display_mode, DisplayMode::Expanded);
}

#[test]
fn top_footer_and_child_flyout_are_invokable() {
    let mut p = props();
    p.pane_display_mode = PaneDisplayMode::Top;
    p.footer_items = vec![Item {
        id: "help".into(),
        text: "Help".into(),
        ..Item::default()
    }];
    let mut v = NavigationView::new(p).unwrap();
    input(
        &mut v,
        Input::Resize {
            width: 1100.,
            height: 400.,
        },
    );
    assert!(v.parts.iter().any(|p| p.id == "help"));
    input(
        &mut v,
        Input::Invoke {
            id: "branch".into(),
        },
    );
    assert!(v.parts.iter().any(|p| p.id == "child"));
    input(&mut v, Input::Invoke { id: "child".into() });
    assert_eq!(v.selected.as_deref(), Some("child"));
    assert!(!v.parts.iter().any(|p| p.id == "child"));
}

#[test]
fn browser_focus_black_frame_is_suppressed_without_losing_focus() {
    let mut v = NavigationView::new(props()).unwrap();
    input(&mut v, Input::Focus { id: "one".into() });
    assert_eq!(v.focused.as_deref(), Some("one"));
    input(
        &mut v,
        Input::Key {
            key: "ArrowDown".into(),
        },
    );
    assert_eq!(v.focused.as_deref(), Some("two"));
    assert!(!display_list(&v)
        .iter()
        .any(|cmd| matches!(cmd,Draw::Stroke{width,..}if *width==2.)));
}

#[test]
fn rapid_indicator_retargets_never_accumulate_length() {
    use winui_wasm::animation::IndicatorTimeline;
    for horizontal in [false, true] {
        let bar = |index: usize| {
            if horizontal {
                Rect::new(100. + index as f64 * 80., 39., 16., 3.)
            } else {
                Rect::new(4., 100. + index as f64 * 40., 3., 16.)
            }
        };
        let mut motion = IndicatorTimeline::default();
        motion.retarget(bar(0), horizontal, 0., false);
        let mut time = 0.;
        let mut previous_target = 0;
        for step in 0..5000 {
            time += 7.;
            let current = motion.visuals(time).last().unwrap().rect;
            let target = [3, 0, 2, 0, 1, 3, 1][step % 7];
            motion.retarget(bar(target), horizontal, time, true);
            let after = motion.visuals(time).last().unwrap().rect;
            assert!((current.x - after.x).abs() < 0.001 && (current.y - after.y).abs() < 0.001);
            assert!(
                (current.width - after.width).abs() < 0.001
                    && (current.height - after.height).abs() < 0.001
            );
            for visual in motion.visuals(time + 3.) {
                let (start, length) = if horizontal {
                    (visual.rect.x, visual.rect.width)
                } else {
                    (visual.rect.y, visual.rect.height)
                };
                let limit = if horizontal { 356. } else { 236. };
                assert!(
                    start >= 100. - 0.001 && start + length <= limit + 0.001,
                    "step {step}: {start} + {length}"
                );
            }
            previous_target = target;
        }
        assert_eq!(
            motion.visuals(time + 1000.).last().unwrap().rect,
            bar(previous_target)
        );
    }
}

#[test]
fn keyboard_scrolls_offscreen_rows_into_the_clipped_menu() {
    let mut p = props();
    p.items = (0..30)
        .map(|n| Item {
            id: format!("item{n}"),
            text: format!("Item {n}"),
            ..Item::default()
        })
        .collect();
    p.selected_id = Some("item0".into());
    let mut v = NavigationView::new(p).unwrap();
    input(
        &mut v,
        Input::Resize {
            width: 800.,
            height: 240.,
        },
    );
    input(&mut v, Input::Focus { id: "item0".into() });
    input(&mut v, Input::Key { key: "End".into() });
    assert_eq!(v.focused.as_deref(), Some("item29"));
    let row = v.parts.iter().find(|p| p.id == "item29").unwrap();
    let clip = row.clip.unwrap();
    assert!(row.rect.y >= clip.y && row.rect.y + row.rect.height <= clip.y + clip.height);
    assert!(v.scroll > 0.);
    input(&mut v, Input::Key { key: "Home".into() });
    assert_eq!(v.scroll, 0.);
}

#[test]
fn fixed_gallery_content_templates_validate_and_reject_unknown_keys() {
    for name in [
        "SamplePage1",
        "SamplePage2",
        "SamplePage3",
        "SamplePage4",
        "SamplePage5",
        "SamplePage6",
        "SamplePage7",
        "SampleSettingsPage",
    ] {
        let node = winui_wasm::content::template(&format!("gallery/{name}")).unwrap();
        node.validate(0, &mut 0).unwrap();
        let mut p = props();
        p.content_node = Some(node);
        let v = NavigationView::new(p).unwrap();
        assert!(display_list(&v)
            .iter()
            .any(|command| matches!(command, Draw::Fill { .. } | Draw::Ellipse { .. })));
    }
    assert!(winui_wasm::content::template("gallery/Unknown").is_err());
}

#[test]
fn source_palette_aliases_and_acrylic_policy_are_explicit() {
    let resources = winui_wasm::resources::Resources::current();
    assert_eq!(
        resources.color(Theme::Light, "NavigationViewSelectionIndicatorForeground"),
        "#0067C0FF"
    );
    assert_eq!(
        resources.color(Theme::Dark, "NavigationViewSelectionIndicatorForeground"),
        "#4CC2FFFF"
    );
    assert!(resources.resolve(Theme::Light, "MissingResource").is_err());
    let mut v = NavigationView::new(props()).unwrap();
    v.update(json!([{"reducedTransparency":true}])).unwrap();
    v.advance(1000.);
    assert_eq!(v.material_motion.value(v.now), 0.);
    v.input(Input::Leave, 1.).unwrap();
    assert_eq!(v.now, 1000.);
}
