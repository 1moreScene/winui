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
    let mut s = Scene::new(Theme::Light, false);
    s.resize(800., 450., 1.25).unwrap();
    s
}
fn frame(s: &mut Scene) -> Value {
    s.layout(&mut Measure);
    s.display_list();
    serde_json::to_value(s.snapshot()).unwrap()
}
fn update(s: &mut Scene, id: u32, patch: Value) {
    s.update(vec![Update { id, patch }]).unwrap();
}
#[test]
fn command_actions_click_three_state_and_real_flyout() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::AppBarToggleButton,
            json!({"commandControls":{"label":"Shuffle"},"isThreeState":true}),
        )
        .unwrap();
    frame(&mut s);
    assert!((s.nodes[&id].rect.height - 64.).abs() < 1e-6);
    for state in [Some(true), None, Some(false)] {
        s.input(Input::Invoke { id }, 10.).unwrap();
        frame(&mut s);
        assert_eq!(s.nodes[&id].props.is_checked, state);
    }
    let dropdown = s
        .create(s.root, NodeKind::DropDownButton, json!({"text":"Email"}))
        .unwrap();
    let flyout = s
        .create(
            dropdown,
            NodeKind::MenuFlyout,
            json!({"menuItems":[{"id":"send","text":"Send","icon":"\u{e725}"}]}),
        )
        .unwrap();
    frame(&mut s);
    s.input(Input::Invoke { id: dropdown }, 20.).unwrap();
    frame(&mut s);
    assert!(s.nodes[&flyout].props.is_open);
    assert!(s.nodes[&dropdown]
        .children
        .iter()
        .any(|i| s.nodes[i].kind == NodeKind::AnimatedIcon));
}
#[test]
fn command_bar_overflow_keeps_identity_and_checked_state() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::CommandBar,json!({"width":500,"commandControls":{"defaultLabelPosition":"Right","primaryCommands":[{"id":"a","label":"Add"},{"id":"b","label":"Toggle","kind":"Toggle"},{"id":"c","label":"Share"}],"secondaryCommands":[{"id":"settings","label":"Settings"}]}})).unwrap();
    let snapshot = frame(&mut s);
    let keys = s.nodes[&id].children.clone();
    let toggle = *keys
        .iter()
        .find(|child| s.nodes[child].kind == NodeKind::AppBarToggleButton)
        .unwrap();
    s.input(Input::Invoke { id: toggle }, 50.).unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&toggle].props.is_checked, Some(true));
    update(&mut s, id, json!({"width":100,"isOpen":true}));
    let v = frame(&mut s);
    assert_eq!(s.nodes[&toggle].props.is_checked, Some(true));
    assert_ne!(s.nodes[&toggle].parent, Some(id));
    assert_eq!(
        v["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .find(|n| n["id"] == id)
            .unwrap()["command"]["overflow"],
        json!(["a", "b", "c", "settings"])
    );
    update(&mut s, id, json!({"width":500}));
    frame(&mut s);
    assert_eq!(s.nodes[&toggle].parent, Some(id));
    assert_eq!(s.nodes[&toggle].props.is_checked, Some(true));
    assert!(snapshot["nodes"].as_array().unwrap().len() > 3);
    s.destroy(id).unwrap();
    frame(&mut s);
    assert_eq!(s.nodes.len(), 1);
}
#[test]
fn selector_optional_selection_disabled_and_keyboard() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::SelectorBar,json!({"navControls":{"items":[{"id":"recent","text":"Recent"},{"id":"disabled","text":"Disabled","enabled":false},{"id":"shared","text":"Shared"}]}})).unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&id].rect.height, 48.);
    assert_eq!(s.nodes[&id].props.selected_index, -1);
    s.navigation_control_command(id, json!({"action":"focusPart","key":"recent"}))
        .unwrap();
    s.input(
        Input::KeyDown {
            key: "ArrowRight".into(),
            repeat: false,
        },
        50.,
    )
    .unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&id].props.selected_index, 2);
    s.navigation_control_command(id, json!({"action":"choose","index":-1}))
        .unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&id].props.selected_index, -1);
}
#[test]
fn all_command_visual_states_render() {
    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
        let mut s = Scene::new(theme, false);
        s.resize(800., 450., 1.25).unwrap();
        for k in [
            NodeKind::AppBarButton,
            NodeKind::AppBarToggleButton,
            NodeKind::DropDownButton,
        ] {
            let id=s.create(s.root,k,json!({"text":"Email","commandControls":{"label":"Command"},"iconSource":{"kind":"Symbol","symbol":"Like"}})).unwrap();
            for checked in [Some(false), Some(true), None] {
                for enabled in [true, false] {
                    update(&mut s, id, json!({"enabled":enabled,"isChecked":checked}));
                    frame(&mut s);
                }
            }
        }
    }
}
#[test]
fn closed_secondary_accelerator_invokes_and_roving_tab_is_single() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::CommandBar,json!({"width":500,"commandControls":{"defaultLabelPosition":"Right","primaryCommands":[{"id":"add","label":"Add"},{"id":"edit","label":"Edit"}],"secondaryCommands":[{"id":"settings","label":"Settings","keyboardAccelerators":[{"key":"I","modifiers":["Control"]}]}]}})).unwrap();
    let v = frame(&mut s);
    let owned = v["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|n| n["command"]["owner"] == id && n["visible"] == true && n["tabStop"] == true)
        .count();
    assert_eq!(owned, 1);
    s.input(
        Input::CommandAccelerator {
            key: "i".into(),
            control: true,
            shift: false,
            alt: false,
        },
        30.,
    )
    .unwrap();
    let v = frame(&mut s);
    assert!(v["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["target"] == id
            && e["kind"] == "ItemClick"
            && e["payload"]["command"]["id"] == "settings"));
}
#[test]
fn minimal_and_hidden_bars_hide_primary_and_restore_on_open() {
    for mode in ["Minimal", "Hidden"] {
        let mut s = scene();
        let id=s.create(s.root,NodeKind::CommandBar,json!({"width":300,"commandControls":{"closedDisplayMode":mode,"primaryCommands":[{"id":"one","label":"One"}]}})).unwrap();
        frame(&mut s);
        let child = *s.nodes[&id]
            .children
            .iter()
            .find(|id| s.nodes[id].kind == NodeKind::AppBarButton)
            .unwrap();
        assert!(!s.nodes[&child].visible);
        assert!((s.nodes[&id].rect.height - if mode == "Hidden" { 0. } else { 24. }).abs() < 1e-6);
        update(&mut s, id, json!({"isOpen":true}));
        frame(&mut s);
        assert!(s.nodes[&child].visible);
    }
}
#[test]
fn ordered_overflow_focus_and_close_do_not_reopen() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::CommandBar,json!({"width":100,"isOpen":true,"commandControls":{"primaryCommands":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"secondaryCommands":[{"id":"last","label":"Last"}]}})).unwrap();
    frame(&mut s);
    let popup = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::Flyout)
        .unwrap()
        .id;
    let children = s
        .nodes
        .values()
        .filter(|n| n.kind == NodeKind::AppBarButton)
        .map(|n| n.id)
        .collect::<Vec<_>>();
    assert!(children.contains(&s.focused.unwrap()));
    s.input(
        Input::KeyDown {
            key: "Escape".into(),
            repeat: false,
        },
        50.,
    )
    .unwrap();
    let v = frame(&mut s);
    let event = v["events"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["kind"] == "closing" && e["target"] == popup)
        .unwrap();
    let request = event["requestId"].as_u64().unwrap() as u32;
    s.input(
        Input::ResolveOverlay {
            id: popup,
            request,
            cancel: false,
        },
        60.,
    )
    .unwrap();
    frame(&mut s);
    assert!(!s.nodes[&id].props.is_open);
    assert!(!s.nodes[&popup].props.is_open);
}
#[test]
fn command_source_removal_replacement_and_kind_change_skip_destroyed_nodes() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::CommandBar,json!({"width":200,"isOpen":true,"commandControls":{"primaryCommands":[{"id":"a","label":"A"}],"secondaryCommands":[{"id":"b","label":"B"},{"id":"c","label":"C"}]}})).unwrap();
    frame(&mut s);
    for items in [
        json!([{ "id":"b","label":"Toggle","kind":"Toggle"},{"id":"separator","kind":"Separator"},{"id":"d","label":"D"}]),
        json!([]),
        json!([{"id":"last","label":"Last"}]),
    ] {
        update(
            &mut s,
            id,
            json!({"commandControls":{"secondaryCommands":items}}),
        );
        frame(&mut s);
    }
    assert!(s.nodes.values().any(|n| n.props.text == "Last"));
}
#[test]
fn partial_secondary_patch_preserves_primary_commands_and_bar_template() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::CommandBar,json!({"width":500,"commandControls":{"defaultLabelPosition":"Right","primaryCommands":[{"id":"add","label":"Add"},{"id":"edit","label":"Edit"},{"id":"share","label":"Share"}],"secondaryCommands":[{"id":"settings","label":"Settings"}]}})).unwrap();
    frame(&mut s);
    let before = s
        .nodes
        .values()
        .filter(|n| {
            n.kind == NodeKind::AppBarButton
                && ["Add", "Edit", "Share"].contains(&n.props.text.as_str())
        })
        .map(|n| n.id)
        .collect::<Vec<_>>();
    update(
        &mut s,
        id,
        json!({"commandControls":{"secondaryCommands":[{"id":"settings","label":"Settings"},{"id":"extra","label":"Extra"}]}}),
    );
    frame(&mut s);
    assert_eq!(
        s.nodes[&id].props.command_controls.primary_commands.len(),
        3
    );
    assert_eq!(
        s.nodes[&id].props.command_controls.default_label_position,
        CommandBarDefaultLabelPosition::Right
    );
    for child in before {
        assert!(s.nodes[&child].visible);
        assert_eq!(s.nodes[&child].parent, Some(id));
    }
}

#[test]
fn primary_patch_and_unrelated_patch_preserve_secondary_source_and_internal_bar_context() {
    use std::sync::Arc;
    let mut s = scene();
    let id=s.create(s.root,NodeKind::CommandBar,json!({"width":500,"commandControls":{"defaultLabelPosition":"Right","primaryCommands":[{"id":"add","label":"Add"}],"secondaryCommands":[{"id":"settings","label":"Settings"}]}})).unwrap();
    frame(&mut s);
    let secondary = s.nodes[&id]
        .props
        .command_controls
        .secondary_commands
        .clone();
    update(
        &mut s,
        id,
        json!({"commandControls":{"primaryCommands":[{"id":"add","label":"Add"},{"id":"edit","label":"Edit"}]}}),
    );
    frame(&mut s);
    assert!(Arc::ptr_eq(
        &secondary,
        &s.nodes[&id].props.command_controls.secondary_commands
    ));
    let child = *s.nodes[&id]
        .children
        .iter()
        .find(|child| s.nodes[child].props.text == "Add")
        .unwrap();
    assert!(s.nodes[&child].props.command_controls.inside_bar);
    update(&mut s, child, json!({"foreground":"#ff0000"}));
    frame(&mut s);
    assert!(s.nodes[&child].props.command_controls.inside_bar);
    assert_eq!(
        s.nodes[&child]
            .props
            .command_controls
            .default_label_position,
        CommandBarDefaultLabelPosition::Right
    );
    update(&mut s, id, json!({"enabled":false}));
    frame(&mut s);
    assert!(Arc::ptr_eq(
        &secondary,
        &s.nodes[&id].props.command_controls.secondary_commands
    ));
    assert_eq!(
        s.nodes[&id].props.command_controls.primary_commands.len(),
        2
    );
}

#[test]
fn selector_pill_clip_is_balanced_during_interrupted_selection() {
    use winui_wasm::render::Draw;
    let mut s = scene();
    let id=s.create(s.root,NodeKind::SelectorBar,json!({"navControls":{"items":[{"id":"a","text":"A"},{"id":"b","text":"B"}]},"selectedIndex":0})).unwrap();
    frame(&mut s);
    for (time, index) in [(30., 1), (60., 0), (90., 1), (300., 0), (600., 1)] {
        s.advance(time);
        update(&mut s, id, json!({"selectedIndex":index}));
        frame(&mut s);
        s.advance(time + 20.);
        s.layout(&mut Measure);
        let mut depth = 0i32;
        let mut pills = 0;
        for draw in s.display_list() {
            match draw {
                Draw::Save | Draw::Clip { .. } | Draw::RoundedClip { .. } => depth += 1,
                Draw::CornerClip { .. } => {
                    depth += 1;
                    pills += 1;
                }
                Draw::Restore => {
                    depth -= 1;
                    assert!(depth >= 0, "restore underflow");
                }
                _ => {}
            }
        }
        assert!(pills > 0, "test must exercise the animated pill clip");
        assert_eq!(depth, 0, "clip must restore its state in both renderers");
    }
}

#[test]
fn appbar_separator_is_noninteractive_and_survives_overflow_reparenting() {
    let mut s=scene();
    let row=s.create(s.root,NodeKind::StackPanel,json!({"orientation":"Horizontal","height":64})).unwrap();
    let separator=s.create(row,NodeKind::AppBarSeparator,json!({})).unwrap();
    frame(&mut s);
    assert!(!s.nodes[&separator].props.is_tab_stop);
    assert!((s.nodes[&separator].rect.width-5.6).abs()<1e-6);
    assert!((s.nodes[&separator].rect.height-64.).abs()<1e-6);
    assert!(s.input(Input::Invoke{id:separator},10.).is_err());
    let bar=s.create(s.root,NodeKind::CommandBar,json!({"width":500,"commandControls":{"primaryCommands":[{"id":"a","label":"Add"},{"id":"separator","kind":"Separator"},{"id":"b","label":"Edit"}],"secondaryCommands":[{"id":"settings","label":"Settings"}]}})).unwrap();
    frame(&mut s);
    let separator=s.nodes.values().find(|n|n.kind==NodeKind::AppBarSeparator&&n.parent==Some(bar)).unwrap().id;
    let original_width=s.nodes[&separator].rect.width;
    update(&mut s,bar,json!({"width":48,"isOpen":true}));frame(&mut s);
    assert_ne!(s.nodes[&separator].parent,Some(bar));
    assert!(s.nodes[&separator].rect.width>5.);
    assert!(s.nodes[&separator].rect.height<16.);
    update(&mut s,bar,json!({"width":500,"isOpen":false}));frame(&mut s);
    assert_eq!(s.nodes[&separator].parent,Some(bar));
    assert!((s.nodes[&separator].rect.width-original_width).abs()<1e-6);
}

#[test]
fn primary_expansion_animates_without_losing_multiline_labels_or_hit_testing() {
    let mut s=scene();s.auto_height=true;s.resize(400.,48.,1.25).unwrap();
    let bar=s.create(s.root,NodeKind::CommandBar,json!({"commandControls":{"primaryCommands":[{"id":"camera","label":"Attach Camera"},{"id":"orientation","label":"Screen orientation"}]}})).unwrap();
    frame(&mut s);s.advance(100.);update(&mut s,bar,json!({"isOpen":true}));
    let start=frame(&mut s);let command=start["nodes"].as_array().unwrap().iter().find(|n|n["id"]==bar).unwrap();
    let full=command["command"]["body"]["height"].as_f64().unwrap();
    assert!(full>=64.);assert_eq!(s.nodes[&bar].rect.height,48.);
    assert_eq!(command["command"]["primaryClip"]["height"],48.);
    assert!(s.presentation_height()>=full);assert!(s.raster_height()>=full);
    s.advance(140.);let middle=frame(&mut s);let command=middle["nodes"].as_array().unwrap().iter().find(|n|n["id"]==bar).unwrap();
    let clip=command["command"]["primaryClip"]["height"].as_f64().unwrap();assert!(clip>48.&&clip<full);
    s.advance(400.);frame(&mut s);
    let action=s.nodes.values().find(|n|n.kind==NodeKind::AppBarButton&&n.props.text=="Attach Camera").unwrap();
    let point=action.world.point(action.rect.width/2.,action.rect.height-3.);let action=action.id;
    assert!(point.1>48.);assert_eq!(s.hit(point.0,point.1),Some(action));
    let more=s.nodes[&bar].children.iter().find(|id|s.nodes[id].kind==NodeKind::Button).copied().unwrap();
    s.input(Input::Focus{id:more},450.).unwrap();s.input(Input::KeyDown{key:"Escape".into(),repeat:false},450.).unwrap();
    frame(&mut s);s.advance(490.);let closing=frame(&mut s);let command=closing["nodes"].as_array().unwrap().iter().find(|n|n["id"]==bar).unwrap();
    let before=command["command"]["primaryClip"]["height"].as_f64().unwrap();assert!(before>48.&&before<full);
    update(&mut s,bar,json!({"isOpen":true}));let reversed=frame(&mut s);let command=reversed["nodes"].as_array().unwrap().iter().find(|n|n["id"]==bar).unwrap();
    assert!((command["command"]["primaryClip"]["height"].as_f64().unwrap()-before).abs()<1e-6);
    s.advance(900.);frame(&mut s);assert!(s.presentation_height()>=full);
}
#[test]
fn explicit_parent_clip_and_reduced_motion_remain_authoritative_for_command_expansion() {
    let mut s=scene();s.auto_height=true;s.resize(400.,48.,1.25).unwrap();
    let parent=s.create(s.root,NodeKind::Grid,json!({"height":48,"clip":true})).unwrap();
    let bar=s.create(parent,NodeKind::CommandBar,json!({"commandControls":{"primaryCommands":[{"id":"camera","label":"Attach Camera"}]}})).unwrap();
    frame(&mut s);s.set_policies(true,false);update(&mut s,bar,json!({"isOpen":true}));let value=frame(&mut s);
    assert_eq!(s.presentation_height(),48.);assert_eq!(s.raster_height(),48.);
    let command=value["nodes"].as_array().unwrap().iter().find(|n|n["id"]==bar).unwrap();
    assert_eq!(command["command"]["expansionProgress"],1.);assert!(!value["animating"].as_bool().unwrap());
}
