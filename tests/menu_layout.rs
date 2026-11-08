use serde_json::{json, Value};
use winui_wasm::{
    enums::*,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, s: &str, f: &Font) -> Metrics {
        Metrics {
            width: s.chars().count() as f64 * f.size * 0.5,
            ascent: f.size * 0.8,
            descent: f.size * 0.2,
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(800., 600., 1.25).unwrap();
    s
}
fn frame(s: &mut Scene) {
    s.layout(&mut Measure);
    s.display_list();
}
fn patch(s: &mut Scene, id: u32, v: Value) {
    s.update(vec![Update { id, patch: v }]).unwrap();
}
fn resolve(s: &mut Scene) {
    let requests = s
        .events
        .iter()
        .filter(|e| e.kind == EventKind::Closing)
        .filter_map(|e| e.request_id.map(|request| (e.target, request)))
        .collect::<Vec<_>>();
    for (id, request) in requests {
        s.input(
            Input::ResolveOverlay {
                id,
                request,
                cancel: false,
            },
            20.,
        )
        .unwrap();
    }
    frame(s);
    frame(s);
}
fn popup(s: &Scene, id: u32) -> u32 {
    s.nodes[&id]
        .children
        .iter()
        .copied()
        .find(|i| s.nodes[i].kind == NodeKind::MenuFlyout)
        .unwrap()
}
fn near(a: f64, b: f64) {
    assert!((a - b).abs() < 0.81, "{a} != {b}");
}
#[test]
fn transient_command_flyout_allocates_shadow_outside_the_rounded_panel() {
    use winui_wasm::render::Draw;
    for theme in [Theme::Light, Theme::Dark] {
        let mut s = scene();
        s.theme = theme;
        let id=s.create(s.root,NodeKind::CommandBarFlyout,json!({"isOpen":true,"menuControls":{"showMode":"Transient"},"commandControls":{"primaryCommands":[{"id":"save","label":"Save"}]}})).unwrap();
        frame(&mut s);
        let panel = s.nodes[&id].rect;
        let surface = s.floating_surface_bounds();
        assert!(surface.y+surface.height>=panel.y+panel.height+16.,"the directional shadow must extend below the panel, not remain only in its transparent corner wedges");
        assert!(surface.x < panel.x && surface.x + surface.width > panel.x + panel.width);
        assert!(s
            .floating_display_list()
            .iter()
            .any(|d| matches!(d, Draw::Shadow { .. })));
        // Allocating the shadow must not enlarge the command's layout/hit rectangle.
        assert_eq!(s.nodes[&id].rect.height, 60.);
    }
}
#[test]
fn official_panel_and_flyout_brush_dependencies_resolve_for_every_theme() {
    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
        for key in [
            "CardBackgroundFillColorSecondaryBrush",
            "CardStrokeColorDefaultBrush",
            "ControlFillColorDefaultBrush",
            "ControlStrokeColorDefaultBrush",
            "AccentFillColorDefaultBrush",
            "TextOnAccentFillColorPrimaryBrush",
            "CommandBarFlyoutBorderBrush",
        ] {
            winui_wasm::resources::Resources::current()
                .resolve(theme, key)
                .unwrap();
        }
    }
}
#[test]
fn secondary_surface_fades_with_owner_instead_of_disappearing_on_close() {
    let mut s = scene();
    s.set_policies(false, false);
    let id=s.create(s.root,NodeKind::CommandBarFlyout,json!({"isOpen":true,"commandControls":{"primaryCommands":[{"id":"save","label":"Save"}],"secondaryCommands":[{"id":"resize","label":"Resize"}]}})).unwrap();
    frame(&mut s);
    frame(&mut s);
    s.advance(250.);
    frame(&mut s);
    let secondary = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::Flyout && n.parent == Some(s.nodes[&id].children[0]))
        .unwrap()
        .id;
    patch(&mut s, id, json!({"isOpen":false}));
    frame(&mut s);
    s.advance(291.5);
    frame(&mut s);
    let overlay = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == secondary)
        .unwrap()
        .overlay
        .unwrap();
    assert!((overlay.opacity - 0.5).abs() < 0.001);
    assert!(overlay.active);
    s.advance(334.);
    frame(&mut s);
    assert_eq!(
        s.snapshot()
            .nodes
            .into_iter()
            .find(|n| n.id == secondary)
            .unwrap()
            .overlay
            .unwrap()
            .opacity,
        0.
    );
}
#[test]
fn flyout_native_opacity_reverses_without_translation_and_settles_on_policy() {
    let mut s = scene();
    s.set_policies(false, false);
    let id=s.create(s.root,NodeKind::CommandBarFlyout,json!({"isOpen":true,"commandControls":{"primaryCommands":[{"id":"save","label":"Save"}]}})).unwrap();
    frame(&mut s);
    s.advance(41.5);
    frame(&mut s);
    let snap = s.snapshot();
    let overlay = snap
        .nodes
        .iter()
        .find(|n| n.id == id)
        .unwrap()
        .overlay
        .as_ref()
        .unwrap();
    assert!((overlay.opacity - 0.5).abs() < 0.001);
    assert_eq!(overlay.offset, [0., 0.]);
    patch(&mut s, id, json!({"isOpen":false}));
    frame(&mut s);
    let before = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .overlay
        .unwrap()
        .opacity;
    assert!((before - 0.5).abs() < 0.001);
    s.advance(62.25);
    frame(&mut s);
    let faded = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .overlay
        .unwrap()
        .opacity;
    assert!(faded > 0. && faded < before);
    patch(&mut s, id, json!({"isOpen":true}));
    frame(&mut s);
    assert!(
        (s.snapshot()
            .nodes
            .into_iter()
            .find(|n| n.id == id)
            .unwrap()
            .overlay
            .unwrap()
            .opacity
            - faded)
            .abs()
            < 0.001
    );
    s.set_policies(true, true);
    frame(&mut s);
    let overlay = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .overlay
        .unwrap();
    assert_eq!(overlay.opacity, 1.);
    assert!(!overlay.active);
    s.destroy(id).unwrap();
    assert!(!s.snapshot().animating);
}
#[test]
fn flyout_desktop_backdrop_and_transient_focus_use_rust_policy() {
    use winui_wasm::render::Draw;
    let mut s = scene();
    let target = s
        .create(s.root, NodeKind::Button, json!({"text":"Target"}))
        .unwrap();
    frame(&mut s);
    s.input(Input::Focus { id: target }, 0.).unwrap();
    let id=s.create(s.root,NodeKind::CommandBarFlyout,json!({"placementTarget":target,"isOpen":true,"menuControls":{"showMode":"Transient"},"commandControls":{"primaryCommands":[{"id":"save"}],"secondaryCommands":[{"id":"more"}]}})).unwrap();
    frame(&mut s);
    assert_eq!(s.snapshot().focused, Some(target));
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d, Draw::SystemBackdrop { .. })));
    assert!(!s
        .display_list()
        .iter()
        .any(|d| matches!(d, Draw::Acrylic { .. })));
    patch(&mut s, id, json!({"isOpen":false}));
    frame(&mut s);
    patch(
        &mut s,
        id,
        json!({"isOpen":true,"menuControls":{"showMode":"Standard"}}),
    );
    frame(&mut s);
    frame(&mut s);
    assert_ne!(s.snapshot().focused, Some(target));
    s.set_policies(true, true);
    frame(&mut s);
    assert!(s
        .display_list()
        .iter()
        .filter_map(|d| if let Draw::SystemBackdrop { weight, .. } = d {
            Some(*weight)
        } else {
            None
        })
        .all(|w| w == 0.));
}
#[test]
fn submenu_hover_delay_cancel_close_and_rtl_keyboard() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::MenuFlyout,json!({"isOpen":true,"flowDirection":"RightToLeft","menuItems":[{"id":"sub","text":"Sub","kind":"Submenu","items":[{"id":"leaf","text":"Leaf"}]},{"id":"plain","text":"Plain"}]})).unwrap();
    frame(&mut s);
    let row = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .overlay
        .unwrap()
        .rows[0];
    let (x, y) = s.nodes[&id].world.point(row.x + 10., row.y + 10.);
    s.input(Input::Move { x, y, pointer: 1 }, 0.).unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&id].children.len(), 0);
    s.advance(399.);
    frame(&mut s);
    assert!(s.nodes[&id].children.is_empty());
    s.advance(400.);
    frame(&mut s);
    let child = s.nodes[&id].children[0];
    assert!(s.nodes[&child].props.is_open);
    // Moving into the submenu keeps it open beyond the delayed-close interval.
    let (cx, cy) = s.nodes[&child].world.point(12., 12.);
    s.input(
        Input::Move {
            x: cx,
            y: cy,
            pointer: 1,
        },
        410.,
    )
    .unwrap();
    s.advance(900.);
    frame(&mut s);
    assert!(s.nodes[&child].props.is_open);
    s.input(Input::Leave, 901.).unwrap();
    s.advance(1301.);
    frame(&mut s);
    assert!(!s.nodes[&child].props.is_open);
    s.input(Input::Focus { id }, 1302.).unwrap();
    s.input(
        Input::KeyDown {
            key: "Home".into(),
            repeat: false,
        },
        1302.,
    )
    .unwrap();
    s.input(
        Input::KeyDown {
            key: "ArrowLeft".into(),
            repeat: false,
        },
        1302.,
    )
    .unwrap();
    frame(&mut s);
    assert!(s.nodes[&child].props.is_open);
    assert_eq!(s.snapshot().focused, Some(child));
    s.input(
        Input::KeyDown {
            key: "ArrowRight".into(),
            repeat: false,
        },
        1303.,
    )
    .unwrap();
    frame(&mut s);
    assert!(!s.nodes[&child].props.is_open);
    s.destroy(id).unwrap();
    assert!(!s.snapshot().animating);
}
#[test]
fn tall_menu_wheel_and_end_key_keep_the_last_command_visible() {
    let mut s = scene();
    s.resize(400., 180., 1.25).unwrap();
    let items = (0..40)
        .map(|i| json!({"id":format!("item{i}"),"text":format!("Item {i}")}))
        .collect::<Vec<_>>();
    let id = s
        .create(
            s.root,
            NodeKind::MenuFlyout,
            json!({"isOpen":true,"menuItems":items}),
        )
        .unwrap();
    frame(&mut s);
    let first = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .overlay
        .unwrap()
        .rows[0]
        .y;
    let (x, y) = s.nodes[&id].world.point(20., 20.);
    assert!(s.wheel(x, y, 0., 80., false).unwrap());
    frame(&mut s);
    assert!(
        s.snapshot()
            .nodes
            .into_iter()
            .find(|n| n.id == id)
            .unwrap()
            .overlay
            .unwrap()
            .rows[0]
            .y
            < first
    );
    s.input(Input::Focus { id }, 0.).unwrap();
    s.input(
        Input::KeyDown {
            key: "End".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    frame(&mut s);
    let node = s.snapshot().nodes.into_iter().find(|n| n.id == id).unwrap();
    let overlay = node.overlay.unwrap();
    let last = overlay.rows.last().unwrap();
    assert_eq!(overlay.selected_index, Some(39));
    assert!(last.y >= 0.);
    assert!(last.y + last.height <= node.rect.height + 0.81);
}
#[test]
fn horizontal_top_aligned_placement_flips_without_losing_top_edge() {
    use winui_wasm::{model::Rect, scene::overlays::place};
    let anchor = Rect::new(380., 37., 30., 200.);
    let (r, side) = place(
        anchor,
        [100., 60.],
        [500., 400.],
        OverlayPlacement::RightEdgeAlignedTop,
        4.,
    );
    assert_eq!(side, OverlayPlacement::Left);
    assert_eq!(r.y, 37.);
    assert_eq!(r.x, 276.);
}
#[test]
fn menus_data_hover_keyboard_skip_disabled_and_release() {
    let mut s = scene();
    let bar=s.create(s.root,NodeKind::MenuBar,json!({"menuControls":{"items":[{"id":"file","title":"File","items":[{"id":"new","text":"New"}]},{"id":"disabled","title":"Disabled","enabled":false},{"id":"edit","title":"Edit","items":[{"id":"copy","text":"Copy"}]}]}})).unwrap();
    frame(&mut s);
    let ids = s.nodes[&bar].children.clone();
    assert_eq!(ids.len(), 3);
    assert!(!s.nodes[&ids[0]].text.lines.is_empty());
    assert!(s.nodes[&ids[0]].rect.width > 20.);
    let a = popup(&s, ids[0]);
    let b = popup(&s, ids[2]);
    s.input(Input::Invoke { id: ids[0] }, 1.).unwrap();
    frame(&mut s);
    assert!(s.nodes[&a].props.is_open);
    s.input(
        Input::KeyDown {
            key: "ArrowRight".into(),
            repeat: false,
        },
        2.,
    )
    .unwrap();
    frame(&mut s);
    assert!(!s.nodes[&a].props.is_open);
    assert!(s.nodes[&b].props.is_open);
    let r = s.nodes[&ids[0]].world.bounds(s.nodes[&ids[0]].rect);
    s.input(
        Input::Move {
            x: r.x + 2.,
            y: 15.,
            pointer: 1,
        },
        3.,
    )
    .unwrap();
    frame(&mut s);
    assert!(s.nodes[&a].props.is_open);
    s.destroy(bar).unwrap();
    frame(&mut s);
    assert_eq!(s.nodes.len(), 1);
}
#[test]
fn menu_item_flat_toggle_event_and_external_close() {
    let mut s = scene();
    let bar = s.create(s.root, NodeKind::MenuBar, json!({})).unwrap();
    let item = s
        .create(
            bar,
            NodeKind::MenuBarItem,
            json!({"text":"View","menuItems":[{"id":"toolbar","text":"Toolbar","kind":"Toggle"}]}),
        )
        .unwrap();
    frame(&mut s);
    patch(&mut s, item, json!({"isOpen":true}));
    frame(&mut s);
    let flyout = popup(&s, item);
    assert!(s.nodes[&flyout].props.is_open);
    s.input(
        Input::MenuInvoke {
            id: flyout,
            index: 0,
        },
        10.,
    )
    .unwrap();
    resolve(&mut s);
    frame(&mut s);
    frame(&mut s);
    let events = serde_json::to_value(s.snapshot()).unwrap();
    assert!(events["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["target"] == item && e["kind"] == "menuItemInvoked"));
    assert!(s.nodes[&item].props.menu_items[0].checked);
    assert!(!s.nodes[&item].props.is_open);
}
#[test]
fn menu_source_updates_preserve_identity_and_reject_duplicates() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::MenuBar,
            json!({"menuControls":{"items":[{"id":"a","title":"A"}]}}),
        )
        .unwrap();
    frame(&mut s);
    let child = s.nodes[&id].children[0];
    patch(
        &mut s,
        id,
        json!({"menuControls":{"items":[{"id":"a","title":"Changed"},{"id":"b"}]}}),
    );
    frame(&mut s);
    assert_eq!(s.nodes[&id].children[0], child);
    assert_eq!(s.nodes[&child].props.text, "Changed");
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"menuControls":{"items":[{"id":"a"},{"id":"a"}]}})
        }])
        .is_err());
}
#[test]
fn command_flyout_primary_stays_secondary_closes() {
    let mut s = scene();
    let button = s
        .create(s.root, NodeKind::Button, json!({"text":"Open"}))
        .unwrap();
    let flyout=s.create(s.root,NodeKind::CommandBarFlyout,json!({"placementTarget":button,"isOpen":true,"commandControls":{"primaryCommands":[{"id":"save","label":"Save"}],"secondaryCommands":[{"id":"resize","label":"Resize"}]}})).unwrap();
    frame(&mut s);
    frame(&mut s);
    let bar = s.nodes[&flyout].children[0];
    let primary = s
        .nodes
        .values()
        .find(|n| n.parent == Some(bar) && n.kind == NodeKind::AppBarButton)
        .unwrap()
        .id;
    s.input(Input::Invoke { id: primary }, 1.).unwrap();
    frame(&mut s);
    assert!(s.nodes[&flyout].props.is_open);
    let secondary = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::AppBarButton && n.props.text == "Resize")
        .unwrap()
        .id;
    s.input(Input::Invoke { id: secondary }, 2.).unwrap();
    frame(&mut s);
    resolve(&mut s);
    frame(&mut s);
    assert!(!s.nodes[&flyout].props.is_open);
    s.destroy(flyout).unwrap();
    assert_eq!(s.nodes.len(), 2);
}
#[test]
fn command_flyout_transient_more_and_always_expanded() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::CommandBarFlyout,json!({"isOpen":true,"menuControls":{"showMode":"Transient"},"commandControls":{"primaryCommands":[{"id":"x"}],"secondaryCommands":[{"id":"y"}]}})).unwrap();
    frame(&mut s);
    let bar = s.nodes[&id].children[0];
    assert!(!s.nodes[&bar].props.is_open);
    patch(&mut s, id, json!({"menuControls":{"alwaysExpanded":true}}));
    frame(&mut s);
    assert!(s.nodes[&bar].props.is_open);
}
#[test]
fn relative_official_four_rectangles_and_resize() {
    let mut s = scene();
    let panel = s
        .create(
            s.root,
            NodeKind::RelativePanel,
            json!({"width":300,"horizontalAlignment":"Left"}),
        )
        .unwrap();
    let a = s
        .create(
            panel,
            NodeKind::Rectangle,
            json!({"layoutKey":"a","width":50,"height":50}),
        )
        .unwrap();
    let b = s
        .create(
            panel,
            NodeKind::Rectangle,
            json!({"width":50,"height":50,"margin":[8,0,0,0],"relative":{"rightOf":"a"}}),
        )
        .unwrap();
    let c = s
        .create(
            panel,
            NodeKind::Rectangle,
            json!({"layoutKey":"c","width":50,"height":50,"relative":{"alignRightWithPanel":true}}),
        )
        .unwrap();
    let d=s.create(panel,NodeKind::Rectangle,json!({"width":50,"height":50,"margin":[0,8,0,0],"relative":{"below":"c","alignHorizontalCenterWith":"c"}})).unwrap();
    frame(&mut s);
    s.validate_panel_layouts().unwrap();
    near(s.nodes[&a].rect.x, 0.);
    near(s.nodes[&b].rect.x, 58.);
    near(s.nodes[&c].rect.x, 250.);
    near(s.nodes[&d].rect.x, 250.);
    near(s.nodes[&d].rect.y, 58.);
    near(s.nodes[&panel].desired[1], 108.);
    patch(&mut s, panel, json!({"width":400}));
    frame(&mut s);
    near(s.nodes[&c].rect.x, 350.);
}
#[test]
fn relative_natural_chains_center_and_opposing_anchors() {
    let mut s = scene();
    let p = s
        .create(
            s.root,
            NodeKind::RelativePanel,
            json!({"horizontalAlignment":"Left"}),
        )
        .unwrap();
    let a = s
        .create(
            p,
            NodeKind::Border,
            json!({"layoutKey":"a","width":80,"height":30,"relative":{"alignRightWithPanel":true}}),
        )
        .unwrap();
    let b = s
        .create(
            p,
            NodeKind::Border,
            json!({"width":50,"height":20,"relative":{"leftOf":"a"}}),
        )
        .unwrap();
    frame(&mut s);
    near(s.nodes[&p].desired[0], 130.);
    near(s.nodes[&b].rect.x, 0.);
    near(s.nodes[&a].rect.x, 50.);
    patch(&mut s, p, json!({"width":300}));
    patch(&mut s, b, json!({"relative":null}));
    frame(&mut s);
    near(s.nodes[&a].rect.x, 220.);
}
#[test]
fn relative_reports_cycles_unknown_names_and_recovers() {
    let mut s = scene();
    let p = s
        .create(s.root, NodeKind::RelativePanel, json!({}))
        .unwrap();
    let a = s
        .create(
            p,
            NodeKind::Border,
            json!({"layoutKey":"a","relative":{"rightOf":"b"}}),
        )
        .unwrap();
    frame(&mut s);
    assert!(s
        .validate_panel_layouts()
        .unwrap_err()
        .contains("not found"));
    let b = s
        .create(
            p,
            NodeKind::Border,
            json!({"layoutKey":"b","relative":{"below":"a"}}),
        )
        .unwrap();
    frame(&mut s);
    assert!(s.validate_panel_layouts().unwrap_err().contains("Circular"));
    patch(&mut s, b, json!({"relative":null}));
    frame(&mut s);
    s.validate_panel_layouts().unwrap();
    s.destroy(a).unwrap();
}
#[test]
fn wrap_horizontal_vertical_padding_and_collapsed() {
    let mut s = scene();
    let p=s.create(s.root,NodeKind::WrapPanel,json!({"width":200,"padding":[10,10,10,10],"panelControls":{"itemSpacing":8,"lineSpacing":12}})).unwrap();
    let mut ids = vec![];
    for _ in 0..3 {
        ids.push(
            s.create(p, NodeKind::Border, json!({"width":80,"height":30}))
                .unwrap(),
        );
    }
    frame(&mut s);
    near(s.nodes[&ids[0]].rect.x, 10.);
    near(s.nodes[&ids[1]].rect.x, 98.);
    near(s.nodes[&ids[2]].rect.y, 52.);
    near(s.nodes[&p].desired[1], 92.);
    patch(&mut s, ids[1], json!({"visible":false}));
    frame(&mut s);
    near(s.nodes[&ids[2]].rect.y, 10.);
    patch(
        &mut s,
        p,
        json!({"width":200,"height":100,"orientation":"Vertical"}),
    );
    frame(&mut s);
    near(s.nodes[&ids[2]].rect.y, 48.);
}
#[test]
fn wrap_last_source_child_stretches_and_invalid_updates_are_atomic() {
    let mut s = scene();
    let p = s
        .create(
            s.root,
            NodeKind::WrapPanel,
            json!({"width":300,"panelControls":{"itemsStretch":"Last","itemSpacing":8}}),
        )
        .unwrap();
    s.create(p, NodeKind::Border, json!({"width":80,"height":30}))
        .unwrap();
    let b = s
        .create(p, NodeKind::Border, json!({"height":30,"minWidth":40}))
        .unwrap();
    frame(&mut s);
    near(s.nodes[&b].rect.width, 212.);
    assert!(s
        .update(vec![Update {
            id: p,
            patch: json!({"panelControls":{"itemSpacing":-2}})
        }])
        .is_err());
    near(
        s.nodes[&p]
            .props
            .panel_controls
            .as_ref()
            .unwrap()
            .item_spacing,
        8.,
    );
}
#[test]
fn relative_measures_wrapped_text_after_dependency_budget() {
    let mut s = scene();
    let p = s
        .create(s.root, NodeKind::RelativePanel, json!({"width":200}))
        .unwrap();
    s.create(
        p,
        NodeKind::Border,
        json!({"layoutKey":"label","width":80,"height":30}),
    )
    .unwrap();
    let text=s.create(p,NodeKind::TextBlock,json!({"text":"A long label that wraps onto several lines without clipping.","wrap":true,"relative":{"rightOf":"label"}})).unwrap();
    frame(&mut s);
    assert!(s.nodes[&text].text.height > 30.);
    assert!(s.nodes[&p].desired[1] >= s.nodes[&text].text.height);
}
#[test]
fn menu_keyboard_enters_presenter_and_selects_first_item() {
    let mut s = scene();
    let bar = s.create(s.root, NodeKind::MenuBar, json!({})).unwrap();
    let item = s
        .create(
            bar,
            NodeKind::MenuBarItem,
            json!({"text":"File","menuItems":[{"id":"new","text":"New"}]}),
        )
        .unwrap();
    frame(&mut s);
    s.input(Input::Focus { id: item }, 1.).unwrap();
    s.input(
        Input::KeyDown {
            key: "ArrowDown".into(),
            repeat: false,
        },
        2.,
    )
    .unwrap();
    frame(&mut s);
    let flyout = popup(&s, item);
    let snap = serde_json::to_value(s.snapshot()).unwrap();
    assert_eq!(snap["focused"], flyout);
    assert_eq!(
        snap["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .find(|n| n["id"] == flyout)
            .unwrap()["overlay"]["selectedIndex"],
        0
    );
    s.input(
        Input::KeyDown {
            key: "Enter".into(),
            repeat: false,
        },
        3.,
    )
    .unwrap();
    frame(&mut s);
    assert!(s
        .events
        .iter()
        .any(|e| e.target == bar && e.item_id.as_deref() == Some("new")));
}
#[test]
fn closed_menu_accelerator_bubbles_to_public_bar() {
    let mut s = scene();
    let bar=s.create(s.root,NodeKind::MenuBar,json!({"menuControls":{"items":[{"id":"file","title":"File","items":[{"id":"new","text":"New","keyboardAccelerators":[{"key":"N","modifiers":["Control"]}]}]}]}})).unwrap();
    frame(&mut s);
    s.input(
        Input::CommandAccelerator {
            key: "n".into(),
            control: true,
            shift: false,
            alt: false,
        },
        1.,
    )
    .unwrap();
    frame(&mut s);
    assert!(s.events.iter().any(|e| e.target == bar
        && e.kind == EventKind::MenuItemInvoked
        && e.item_id.as_deref() == Some("new")));
}
#[test]
fn submenu_invocation_updates_nested_radio_state_and_closes_root() {
    let mut s = scene();
    let root=s.create(s.root,NodeKind::MenuFlyout,json!({"isOpen":true,"menuItems":[{"id":"new","text":"New","kind":"Submenu","items":[{"id":"a","text":"A","kind":"Radio","groupName":"g"},{"id":"b","text":"B","kind":"Radio","groupName":"g","checked":true}]}]})).unwrap();
    frame(&mut s);
    s.input(Input::MenuInvoke { id: root, index: 0 }, 1.)
        .unwrap();
    frame(&mut s);
    let child = s.nodes[&root].children[0];
    assert!(s.nodes[&child].props.is_open);
    s.input(
        Input::MenuInvoke {
            id: child,
            index: 0,
        },
        2.,
    )
    .unwrap();
    assert!(s.nodes[&root].props.menu_items[0].items[0].checked);
    assert!(!s.nodes[&root].props.menu_items[0].items[1].checked);
    resolve(&mut s);
    assert!(!s.nodes[&root].props.is_open);
    assert!(!s.nodes[&child].props.is_open);
}
#[test]
fn menubar_has_real_caption_draws_and_one_tab_entry() {
    let mut s = scene();
    let bar=s.create(s.root,NodeKind::MenuBar,json!({"menuControls":{"items":[{"id":"file","title":"File"},{"id":"edit","title":"Edit"}]}})).unwrap();
    frame(&mut s);
    let list = serde_json::to_value(s.display_list()).unwrap().to_string();
    assert!(list.contains("File") && list.contains("Edit"));
    let snapshot = serde_json::to_value(s.snapshot()).unwrap();
    assert_eq!(
        snapshot["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|n| n["parent"] == bar && n["tabStop"] == true)
            .count(),
        1
    );
}

#[test]
fn menu_caption_and_nested_popup_display_lists_balance_every_clip() {
    use winui_wasm::render::Draw;
    let mut s = scene();
    let bar=s.create(s.root,NodeKind::MenuBar,json!({"menuControls":{"items":[{"id":"file","title":"File","items":[{"id":"new","text":"New","kind":"Submenu","items":[{"id":"plain","text":"Plain text"}]}]}]}})).unwrap();
    frame(&mut s);
    let header = s.nodes[&bar].children[0];
    for open in [false, true] {
        patch(&mut s, header, json!({"isOpen":open}));
        frame(&mut s);
        if open {
            s.input(
                Input::MenuInvoke {
                    id: popup(&s, header),
                    index: 0,
                },
                10.,
            )
            .unwrap();
            frame(&mut s);
        }
        let mut depth = 0;
        for draw in s.display_list() {
            match draw {
                Draw::Save
                | Draw::Clip { .. }
                | Draw::RoundedClip { .. }
                | Draw::CornerClip { .. } => depth += 1,
                Draw::Restore => {
                    depth -= 1;
                    assert!(depth >= 0, "restore underflow");
                }
                _ => {}
            }
        }
        assert_eq!(
            depth, 0,
            "Canvas2D and WebGL2 must receive balanced clip scopes"
        );
    }
}
