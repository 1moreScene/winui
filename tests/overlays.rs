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
fn frame(s: &mut Scene, t: f64) {
    s.advance(t);
    s.layout(&mut Measure);
}
fn patch(s: &mut Scene, id: u32, p: serde_json::Value) {
    s.update(vec![Update { id, patch: p }]).unwrap();
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(500., 300., 1.25).unwrap();
    s
}
#[test]
fn floating_content_does_not_measure_into_its_logical_parent_and_escapes_clip() {
    let mut s = scene();
    let parent = s
        .create(
            s.root,
            NodeKind::StackPanel,
            json!({"width":80,"height":40,"clip":true}),
        )
        .unwrap();
    let popup = s
        .create(
            parent,
            NodeKind::Popup,
            json!({"isOpen":true,"horizontalOffset":110,"verticalOffset":30}),
        )
        .unwrap();
    let child = s
        .create(
            popup,
            NodeKind::Button,
            json!({"text":"Floating","width":200,"height":50}),
        )
        .unwrap();
    frame(&mut s, 0.);
    assert!((s.nodes[&popup].rect.width - 200.).abs() < 1e-8);
    assert_eq!(s.nodes[&parent].desired, [80., 40.]);
    let n = &s.nodes[&child];
    let (x, y) = n.world.point(10., 10.);
    assert_eq!(s.hit(x, y), Some(child));
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d,winui_wasm::render::Draw::Text{text,..} if text=="Floating")));
}
#[test]
fn placement_flips_and_shifts_inside_viewport() {
    use winui_wasm::{model::Rect, scene::overlays::place};
    let (r, p) = place(
        Rect::new(480., 1., 20., 30.),
        [180., 80.],
        [500., 300.],
        OverlayPlacement::Top,
        4.,
    );
    assert_eq!(p, OverlayPlacement::Bottom);
    assert!(r.x >= 0. && r.x + r.width <= 500. && r.y >= 0.);
    let (r, _) = place(
        Rect::default(),
        [1000., 1000.],
        [100., 80.],
        OverlayPlacement::Right,
        4.,
    );
    assert_eq!([r.width, r.height], [100., 80.]);
}
#[test]
fn outside_dismiss_is_cancellable_and_restores_focus() {
    let mut s = scene();
    let owner = s
        .create(
            s.root,
            NodeKind::Button,
            json!({"text":"Owner","width":80,"height":32}),
        )
        .unwrap();
    frame(&mut s, 0.);
    s.input(Input::Focus { id: owner }, 0.).unwrap();
    let flyout = s
        .create(
            s.root,
            NodeKind::Flyout,
            json!({"placementTarget":owner,"width":160,"height":80,"isOpen":true}),
        )
        .unwrap();
    let content = s
        .create(flyout, NodeKind::Button, json!({"text":"Content"}))
        .unwrap();
    frame(&mut s, 1.);
    assert_eq!(s.focused, Some(content));
    s.snapshot();
    s.input(
        Input::Down {
            x: 1.,
            y: 1.,
            pointer: 1,
        },
        2.,
    )
    .unwrap();
    let event = s
        .snapshot()
        .events
        .into_iter()
        .find(|e| e.kind == EventKind::Closing)
        .unwrap();
    s.input(
        Input::ResolveOverlay {
            id: flyout,
            request: event.request_id.unwrap(),
            cancel: true,
        },
        2.,
    )
    .unwrap();
    assert!(s.properties(flyout).unwrap().is_open);
    s.input(
        Input::KeyDown {
            key: "Escape".into(),
            repeat: false,
        },
        3.,
    )
    .unwrap();
    let event = s
        .snapshot()
        .events
        .into_iter()
        .find(|e| e.kind == EventKind::Closing)
        .unwrap();
    s.input(
        Input::ResolveOverlay {
            id: flyout,
            request: event.request_id.unwrap(),
            cancel: false,
        },
        3.,
    )
    .unwrap();
    frame(&mut s, 3.);
    assert!(!s.nodes[&flyout].visible);
    assert_eq!(s.focused, Some(owner));
}
#[test]
fn nested_surfaces_close_with_owner_and_destroy_without_stale_capture() {
    let mut s = scene();
    let popup = s
        .create(
            s.root,
            NodeKind::Popup,
            json!({"isOpen":true,"width":200,"height":100}),
        )
        .unwrap();
    let menu = s
        .create(
            popup,
            NodeKind::MenuFlyout,
            json!({"isOpen":true,"menuItems":[{"id":"a","text":"A"}]}),
        )
        .unwrap();
    frame(&mut s, 0.);
    patch(&mut s, popup, json!({"isOpen":false}));
    frame(&mut s, 1.);
    assert!(!s.nodes[&menu].visible);
    s.destroy(popup).unwrap();
    assert!(s.get(menu).is_err());
    assert!(s.snapshot().nodes.iter().all(|n| n.overlay.is_none()));
}
#[test]
fn tooltip_delay_hide_timeout_and_owner_destruction() {
    let mut s = scene();
    let owner = s
        .create(
            s.root,
            NodeKind::Button,
            json!({"text":"Owner","width":100,"height":32}),
        )
        .unwrap();
    let tip = s
        .create(
            s.root,
            NodeKind::ToolTip,
            json!({"text":"Help","placementTarget":owner}),
        )
        .unwrap();
    frame(&mut s, 0.);
    let n = &s.nodes[&owner];
    let (x, y) = n.world.point(10., 10.);
    s.input(Input::Move { x, y, pointer: 1 }, 0.).unwrap();
    frame(&mut s, 399.);
    assert!(!s.nodes[&tip].visible);
    frame(&mut s, 400.);
    assert!(s.nodes[&tip].visible);
    frame(&mut s, 5400.);
    assert!(!s.nodes[&tip].visible);
    s.destroy(owner).unwrap();
    frame(&mut s, 5500.);
    assert!(!s.nodes[&tip].visible);
}
#[test]
fn menu_keyboard_skips_disabled_separator_and_reports_checked_state() {
    let mut s = scene();
    let menu=s.create(s.root,NodeKind::MenuFlyout,json!({"isOpen":true,"menuItems":[{"id":"skip","enabled":false},{"id":"sep","kind":"Separator"},{"id":"option","text":"Option","kind":"Toggle"}]})).unwrap();
    frame(&mut s, 0.);
    s.snapshot();
    s.input(
        Input::KeyDown {
            key: "ArrowDown".into(),
            repeat: false,
        },
        1.,
    )
    .unwrap();
    s.input(
        Input::KeyDown {
            key: "Enter".into(),
            repeat: false,
        },
        2.,
    )
    .unwrap();
    let snapshot = s.snapshot();
    let event = snapshot
        .events
        .iter()
        .find(|e| e.kind == EventKind::MenuItemInvoked)
        .unwrap();
    assert_eq!(event.item_id.as_deref(), Some("option"));
    assert_eq!(event.is_checked, Some(Some(true)));
    assert!(s.properties(menu).unwrap().menu_items[2].checked);
}
#[test]
fn slider_drag_step_ties_direction_keys_and_default_tooltip() {
    let mut s = scene();
    let slider = s
        .create(
            s.root,
            NodeKind::Slider,
            json!({"width":218,"height":32,"stepFrequency":10}),
        )
        .unwrap();
    frame(&mut s, 0.);
    let n = &s.nodes[&slider];
    let (x, y) = n.world.point(109., 16.);
    s.input(Input::Down { x, y, pointer: 1 }, 1.).unwrap();
    assert_eq!(s.properties(slider).unwrap().value, 50.);
    s.input(
        Input::Move {
            x: x + 100.,
            y,
            pointer: 1,
        },
        2.,
    )
    .unwrap();
    assert_eq!(s.properties(slider).unwrap().value, 100.);
    s.input(
        Input::Up {
            x: x + 100.,
            y,
            pointer: 1,
        },
        3.,
    )
    .unwrap();
    assert!(s.captured.is_none());
    s.input(
        Input::KeyDown {
            key: "Home".into(),
            repeat: false,
        },
        4.,
    )
    .unwrap();
    s.input(
        Input::KeyDown {
            key: "ArrowRight".into(),
            repeat: false,
        },
        5.,
    )
    .unwrap();
    assert_eq!(s.properties(slider).unwrap().value, 1.);
    patch(&mut s, slider, json!({"isDirectionReversed":true}));
    s.input(
        Input::KeyDown {
            key: "ArrowRight".into(),
            repeat: false,
        },
        6.,
    )
    .unwrap();
    assert_eq!(s.properties(slider).unwrap().value, 0.);
    frame(&mut s, 6.);
    let snap = s.snapshot();
    let tip = snap
        .nodes
        .iter()
        .find(|n| n.kind == NodeKind::ToolTip)
        .unwrap();
    assert!(tip.visible);
    assert_eq!(tip.props.text, "0");
    s.destroy(slider).unwrap();
    assert!(s.get(tip.id).is_err());
}
#[test]
fn invalid_menu_range_target_and_transaction_are_rejected() {
    let mut s = scene();
    assert!(s
        .create(
            s.root,
            NodeKind::MenuFlyout,
            json!({"menuItems":[{"id":"a"},{"id":"a"}]})
        )
        .is_err());
    assert!(s
        .create(s.root, NodeKind::Flyout, json!({"placementTarget":999}))
        .is_err());
    let slider = s
        .create(s.root, NodeKind::Slider, json!({"value":20}))
        .unwrap();
    assert!(s
        .update(vec![
            Update {
                id: slider,
                patch: json!({"value":30})
            },
            Update {
                id: slider,
                patch: json!({"stepFrequency":0})
            }
        ])
        .is_err());
    assert_eq!(s.properties(slider).unwrap().value, 20.);
}

#[test]
fn floating_focus_stops_at_popup_boundary_and_material_keeps_rounded_clip() {
    let mut s = scene();
    let viewer = s
        .create(
            s.root,
            NodeKind::ScrollViewer,
            json!({"width":120,"height":40}),
        )
        .unwrap();
    let content = s
        .create(viewer, NodeKind::StackPanel, json!({"height":300}))
        .unwrap();
    s.create(
        content,
        NodeKind::Button,
        json!({"text":"Owner","height":32}),
    )
    .unwrap();
    let popup = s
        .create(
            content,
            NodeKind::Flyout,
            json!({"isOpen":true,"width":160,"height":90,"verticalOffset":140}),
        )
        .unwrap();
    let button = s
        .create(popup, NodeKind::Button, json!({"text":"Floating focus"}))
        .unwrap();
    frame(&mut s, 0.);
    s.input(Input::Focus { id: button }, 1.).unwrap();
    frame(&mut s, 1.);
    assert_eq!(s.properties(viewer).unwrap().vertical_offset, 0.);
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d,winui_wasm::render::Draw::RoundedClip{radius,..} if *radius==8.)));
    assert!(s
        .update(vec![Update {
            id: popup,
            patch: json!({"placementTarget":button})
        }])
        .is_err());
    assert!(s
        .create(popup, NodeKind::Button, json!({"text":"Second child"}))
        .is_err());
}

#[test]
fn explicit_tooltip_open_state_survives_service_clock() {
    let mut s = scene();
    let owner = s
        .create(s.root, NodeKind::Button, json!({"text":"Owner"}))
        .unwrap();
    let tip = s
        .create(
            s.root,
            NodeKind::ToolTip,
            json!({"text":"Manual","isOpen":true,"placementTarget":owner}),
        )
        .unwrap();
    frame(&mut s, 0.);
    frame(&mut s, 1000.);
    assert!(s.nodes[&tip].visible);
    patch(&mut s, tip, json!({"isOpen":false}));
    s.input(Input::Focus { id: owner }, 1001.).unwrap();
    frame(&mut s, 2000.);
    assert!(!s.nodes[&tip].visible);
}

#[test]
fn floating_timelines_delay_translate_reverse_and_finish_once() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(500., 300., 1.25).unwrap();
    let owner = s
        .create(s.root, NodeKind::Button, json!({"width":100,"height":32}))
        .unwrap();
    let f = s
        .create(
            s.root,
            NodeKind::Flyout,
            json!({"placementTarget":owner,"width":160,"height":80,"isOpen":true}),
        )
        .unwrap();
    frame(&mut s, 0.);
    let a = s.snapshot();
    let v = a
        .nodes
        .iter()
        .find(|n| n.id == f)
        .unwrap()
        .overlay
        .as_ref()
        .unwrap();
    assert_eq!(v.opacity, 0.);
    assert!(v.offset[1].abs() > 40.);
    assert!(a.animating);
    // Opened reports the arranged popup, independently of its loading animation.
    assert_eq!(
        a.events
            .iter()
            .filter(|e| e.kind == EventKind::Opened)
            .count(),
        1
    );
    frame(&mut s, 100.);
    let a = s.snapshot();
    let v = a
        .nodes
        .iter()
        .find(|n| n.id == f)
        .unwrap()
        .overlay
        .as_ref()
        .unwrap();
    assert!(v.opacity > 0. && v.opacity < 1.);
    let before = v.offset;
    patch(&mut s, f, json!({"isOpen":false}));
    frame(&mut s, 110.);
    let a = s.snapshot();
    let v = a
        .nodes
        .iter()
        .find(|n| n.id == f)
        .unwrap()
        .overlay
        .as_ref()
        .unwrap();
    assert!(v.active);
    assert_eq!(v.offset, before);
    assert!(!v.is_open);
    patch(&mut s, f, json!({"isOpen":true}));
    frame(&mut s, 110.);
    assert!(s.nodes[&f].visible);
    frame(&mut s, 600.);
    let a = s.snapshot();
    assert_eq!(
        a.events
            .iter()
            .filter(|e| e.kind == EventKind::Opened)
            .count(),
        1
    );
    assert!(!a.events.iter().any(|e| e.kind == EventKind::Closed));
    assert!(!a.animating);
    patch(&mut s, f, json!({"isOpen":false}));
    frame(&mut s, 700.);
    assert_eq!(
        s.snapshot()
            .events
            .iter()
            .filter(|e| e.kind == EventKind::Closed)
            .count(),
        1
    );
    assert!(!s.nodes[&f].visible);
}

#[test]
fn tooltip_and_menu_share_shadow_material_and_motion_policies() {
    use winui_wasm::render::Draw;
    let mut s = Scene::new(Theme::Light, false);
    s.resize(500., 300., 1.).unwrap();
    let tip = s
        .create(
            s.root,
            NodeKind::ToolTip,
            json!({"text":"Help","isOpen":true}),
        )
        .unwrap();
    let menu = s
        .create(
            s.root,
            NodeKind::MenuFlyout,
            json!({"menuItems":[{"id":"a","text":"Command"}],"isOpen":true}),
        )
        .unwrap();
    frame(&mut s, 80.);
    let a = s.snapshot();
    assert!(
        a.nodes
            .iter()
            .find(|n| n.id == tip)
            .unwrap()
            .overlay
            .as_ref()
            .unwrap()
            .opacity
            < 1.
    );
    assert!(
        a.nodes
            .iter()
            .find(|n| n.id == menu)
            .unwrap()
            .overlay
            .as_ref()
            .unwrap()
            .offset[1]
            .abs()
            > 0.
    );
    frame(&mut s, 400.);
    let draw = s.display_list();
    assert!(
        draw.iter()
            .filter(|d| matches!(d, Draw::Shadow { .. }))
            .count()
            >= 2
    );
    assert!(
        draw.iter()
            .filter(|d| matches!(d,Draw::Acrylic{weight,..}|Draw::SystemBackdrop{weight,..} if *weight==1.))
            .count()
            >= 2
    );
    s.reduced_transparency = true;
    assert!(s.display_list().iter().all(
        |d| !matches!(d,Draw::Acrylic{weight,..}|Draw::SystemBackdrop{weight,..} if *weight!=0.)
    ));
    s.theme = Theme::HighContrast;
    s.reduced_motion = true;
    frame(&mut s, 410.);
    assert!(!s.snapshot().animating);
    assert!(!s
        .display_list()
        .iter()
        .any(|d| matches!(d, Draw::Shadow { .. })));
}

#[test]
fn automatic_scroll_extent_excludes_floating_content() {
    let mut s = scene();
    let viewer = s
        .create(
            s.root,
            NodeKind::ScrollViewer,
            json!({"width":220,"height":48,"verticalScrollBarVisibility":"Auto"}),
        )
        .unwrap();
    let panel = s.create(viewer, NodeKind::Grid, json!({})).unwrap();
    s.create(panel, NodeKind::Button, json!({"text":"Empty cart"}))
        .unwrap();
    let f = s
        .create(
            panel,
            NodeKind::Flyout,
            json!({"isOpen":true,"width":260,"height":200}),
        )
        .unwrap();
    s.create(f, NodeKind::Button, json!({"text":"Content"}))
        .unwrap();
    frame(&mut s, 0.);
    let snap = s.snapshot();
    let scroll = snap
        .nodes
        .iter()
        .find(|n| n.id == viewer)
        .unwrap()
        .scroll
        .as_ref()
        .unwrap();
    assert_eq!(scroll.scrollable_height, 0.);
    assert!(scroll.vertical_thumb.is_none());
}

#[test]
fn menu_native_geometry_caches_invocation_density_and_uses_template_columns() {
    use winui_wasm::render::Draw;
    let mut s = Scene::new(Theme::Light, true);
    s.resize(1000., 500., 1.25).unwrap();
    let c = s.create(s.root, NodeKind::Canvas, json!({})).unwrap();
    let owner = s
        .create(
            c,
            NodeKind::Button,
            json!({"canvasLeft":440,"canvasTop":300,"width":100,"height":32}),
        )
        .unwrap();
    let menu=s.create(c,NodeKind::MenuFlyout,json!({"placementTarget":owner,"width":220,"menuItems":[{"id":"open","text":"Open"},{"id":"save","text":"Save"},{"id":"sep","kind":"Separator"},{"id":"option","kind":"Toggle","text":"Enable option","checked":true},{"id":"disabled","text":"Unavailable","enabled":false}]})).unwrap();
    frame(&mut s, 0.);
    s.input(
        Input::KeyDown {
            key: "ArrowRight".into(),
            repeat: false,
        },
        1.,
    )
    .unwrap();
    patch(&mut s, menu, json!({"isOpen":true}));
    frame(&mut s, 2.);
    let snap = s.snapshot();
    let n = snap.nodes.iter().find(|n| n.id == menu).unwrap();
    let rows = &n.overlay.as_ref().unwrap().rows;
    assert!((n.rect.height - 136.8).abs() < 1e-6);
    assert_eq!(rows[0].height, 32.);
    assert_eq!(rows[2].height, 3.2);
    let draws = s.display_list();
    assert!(draws
        .iter()
        .any(|v| matches!(v,Draw::Text{text,x,..} if text=="Open" && (*x-44.).abs()<0.81)));
    assert!(draws
        .iter()
        .any(|v| matches!(v,Draw::Text{text,..} if text=="\u{e73e}")));
    s.input(Input::PointerDevice { touch: true }, 3.).unwrap();
    s.input(
        Input::Move {
            x: 10.,
            y: 10.,
            pointer: 8,
        },
        3.,
    )
    .unwrap();
    frame(&mut s, 3.);
    assert_eq!(
        s.snapshot()
            .nodes
            .iter()
            .find(|n| n.id == menu)
            .unwrap()
            .overlay
            .as_ref()
            .unwrap()
            .rows[0]
            .height,
        32.
    );
    patch(&mut s, menu, json!({"isOpen":false}));
    frame(&mut s, 4.);
    patch(&mut s, menu, json!({"isOpen":true}));
    frame(&mut s, 5.);
    assert_eq!(
        s.snapshot()
            .nodes
            .iter()
            .find(|n| n.id == menu)
            .unwrap()
            .overlay
            .as_ref()
            .unwrap()
            .rows[0]
            .height,
        40.
    );
}
#[test]
fn menu_without_toggle_does_not_reserve_a_check_column_and_pressed_brush_is_real() {
    use winui_wasm::render::Draw;
    let mut s = scene();
    let menu = s
        .create(
            s.root,
            NodeKind::MenuFlyout,
            json!({"isOpen":true,"width":220,"menuItems":[{"id":"one","text":"Only command"}]}),
        )
        .unwrap();
    frame(&mut s, 0.);
    assert!(s
        .display_list()
        .iter()
        .any(|v| matches!(v,Draw::Text{text,x,..} if text=="Only command" && (*x-16.).abs()<0.81)));
    let snap = s.snapshot();
    let n = snap.nodes.iter().find(|n| n.id == menu).unwrap();
    let r = n.overlay.as_ref().unwrap().rows[0];
    let x = n.world.0[4] + r.x + r.width / 2.;
    let y = n.world.0[5] + r.y + r.height / 2.;
    s.input(Input::Down { x, y, pointer: 7 }, 1.).unwrap();
    frame(&mut s, 1.);
    let contract: serde_json::Value =
        serde_json::from_str(include_str!("../references/overlay-template.json")).unwrap();
    let expected: winui_wasm::resources::Brush = serde_json::from_value(
        contract["palettes"]["Light"]["MenuFlyoutItemBackgroundPressed"].clone(),
    )
    .unwrap();
    let expected = expected.solid_color();
    assert!(s
        .display_list()
        .iter()
        .any(|v| matches!(v,Draw::Fill{color,radius,..} if color==&expected && *radius==4.)));
}
#[test]
fn menu_windowed_popup_moves_full_presenter_and_clips_to_native_shadow_insets() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(640., 480., 1.).unwrap();
    let c = s.create(s.root, NodeKind::Canvas, json!({})).unwrap();
    let owner = s
        .create(
            c,
            NodeKind::Button,
            json!({"canvasLeft":280,"canvasTop":220,"width":80,"height":32}),
        )
        .unwrap();
    let menu=s.create(c,NodeKind::MenuFlyout,json!({"isOpen":true,"placementTarget":owner,"placement":"Top","width":200,"height":120,"menuItems":[{"id":"one","text":"Command"}]})).unwrap();
    frame(&mut s, 0.);
    let snap = s.snapshot();
    let overlay = snap
        .nodes
        .iter()
        .find(|n| n.id == menu)
        .unwrap()
        .overlay
        .as_ref()
        .unwrap();
    assert_eq!(overlay.offset, [0., 60.]);
    assert_eq!(overlay.clip.x, -10.);
    assert_eq!(overlay.clip.y, -62.);
    assert_eq!(overlay.clip.width, 220.);
    assert_eq!(overlay.clip.height, 140.);
}

#[test]
fn fresh_floating_surface_does_not_skip_its_first_frame_after_host_delay() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(500., 300., 1.).unwrap();
    let owner = s
        .create(s.root, NodeKind::Button, json!({"width":100,"height":32}))
        .unwrap();
    frame(&mut s, 0.);
    let flyout = s
        .create(
            s.root,
            NodeKind::Flyout,
            json!({"isOpen":true,"placementTarget":owner,"width":160,"height":80}),
        )
        .unwrap();
    s.advance(120.);
    s.layout(&mut Measure);
    let snap = s.snapshot();
    let v = snap
        .nodes
        .iter()
        .find(|n| n.id == flyout)
        .unwrap()
        .overlay
        .as_ref()
        .unwrap();
    assert_eq!(v.opacity, 0.);
    assert!((v.offset[0].abs() + v.offset[1].abs() - 50.).abs() < 1e-6);
    assert!(v.active);
    frame(&mut s, 220.);
    let snap = s.snapshot();
    let v = snap
        .nodes
        .iter()
        .find(|n| n.id == flyout)
        .unwrap()
        .overlay
        .as_ref()
        .unwrap();
    assert!(v.opacity > 0. && v.opacity < 1.);
    assert!(v.offset[0].abs() + v.offset[1].abs() < 50.);
}

#[test]
fn popup_acrylic_uses_each_border_corners_inner_ellipse_including_fallback() {
    use winui_wasm::render::Draw;
    let mut s = Scene::new(Theme::Dark, true);
    s.resize(500., 300., 1.25).unwrap();
    let popup = s
        .create(
            s.root,
            NodeKind::Popup,
            json!({"isOpen":true,"horizontalOffset":40,"verticalOffset":40}),
        )
        .unwrap();
    s.create(popup,NodeKind::Border,json!({"width":200,"height":120,"cornerRadii":[24,8,20,4],"borderThickness":[1,2,3,4],"acrylicResource":"FlyoutPresenterBackground"})).unwrap();
    for fallback in [false, true] {
        s.reduced_transparency = fallback;
        frame(&mut s, 0.);
        let clip = s
            .display_list()
            .into_iter()
            .find_map(|d| {
                if let Draw::CornerClip { rect, radii } = d {
                    Some((rect, radii))
                } else {
                    None
                }
            })
            .unwrap();
        assert_eq!(clip.0, winui_wasm::model::Rect::new(1., 2., 196., 114.));
        assert_eq!(clip.1, [[23., 22.], [5., 6.], [17., 16.], [3., 0.]]);
        assert!(s.display_list().iter().any(
            |d| matches!(d,Draw::Acrylic{weight,..} if *weight == if fallback {0.} else {1.})
        ));
    }
}

#[test]
fn high_contrast_material_alias_keeps_asymmetric_corners_and_inner_border_clip() {
    use winui_wasm::render::Draw;
    let mut s = Scene::new(Theme::HighContrast, true);
    s.resize(500., 300., 1.25).unwrap();
    let popup = s
        .create(s.root, NodeKind::Popup, json!({"isOpen":true}))
        .unwrap();
    s.create(popup,NodeKind::Border,json!({"width":200,"height":120,"cornerRadii":[24,8,20,4],"borderThickness":[1,2,3,4],"acrylicResource":"FlyoutPresenterBackground"})).unwrap();
    frame(&mut s, 0.);
    let list = s.display_list();
    let clip = list
        .iter()
        .position(|d| matches!(d, Draw::CornerClip { .. }))
        .unwrap();
    assert!(matches!(list[clip + 1], Draw::Fill { radius: 0., .. }));
    assert!(!list.iter().any(|d| matches!(d, Draw::Acrylic { .. })));
}
