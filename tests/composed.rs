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
fn combo_popup_restores_official_acrylic_and_separates_the_shadow_surface() {
    use winui_wasm::{render::Draw, resources::Resources};
    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
        for editable in [false, true] {
            let mut s = Scene::new(theme, true);
            s.resize(500., 300., 1.25).unwrap();
            let id = s.create(s.root, NodeKind::ComboBox, json!({
                "width":240,"isEditable":editable,"isDropDownOpen":true,
                "collectionItems":[{"id":"a","text":"Alpha"},{"id":"b","text":"Beta"}]
            })).unwrap();
            frame(&mut s, 1000.);
            let popup = s.nodes[&id].composed.parts["Popup"];
            assert_eq!(s.nodes[&popup].props.acrylic_resource.as_deref(), Some("ComboBoxDropDownBackground"));
            let draws = s.floating_display_list();
            let windows: Vec<_> = draws.iter().filter_map(|d| match d {
                Draw::WindowLayer { inherit_backdrop, .. } => Some(*inherit_backdrop),
                _ => None,
            }).collect();
            assert_eq!(windows, [false, true]);
            if theme == Theme::HighContrast {
                assert!(!draws.iter().any(|d| matches!(d, Draw::Acrylic { .. })));
            } else {
                let official = Resources::current().resolve_material(theme, "AcrylicInAppFillColorDefaultBrush").unwrap();
                assert!(draws.iter().any(|d| matches!(d, Draw::Acrylic { recipe, weight, .. }
                    if recipe.tint_color == official.tint && recipe.tint_opacity == official.tint_opacity
                    && recipe.luminosity_opacity == official.luminosity_opacity && *weight == 1.)));
                s.reduced_transparency = true;
                assert!(s.floating_display_list().iter().any(|d| matches!(d, Draw::Acrylic { weight, .. } if *weight == 0.)));
            }
        }
    }
}
#[test]
fn inline_combo_popup_uses_the_window_viewport_instead_of_the_32_dip_scene() {
    let mut s=Scene::new(Theme::Light,true);
    s.resize(132.,32.,1.).unwrap();
    s.popup_viewport=Some(winui_wasm::model::Rect::new(-1100.,-120.,1440.,1000.));
    let id=s.create(s.root,NodeKind::ComboBox,json!({"width":132,"selectedIndex":0,
        "collectionItems":[{"id":"light","text":"Light"},{"id":"dark","text":"Dark"},{"id":"hc","text":"High contrast"}]})).unwrap();
    frame(&mut s,0.);
    s.input(Input::Down{x:30.,y:16.,pointer:1},0.).unwrap();
    s.input(Input::Up{x:30.,y:16.,pointer:1},10.).unwrap();frame(&mut s,1000.);
    assert!(s.nodes[&id].props.is_drop_down_open,"clicking the readonly input body must open the control");
    let popup=s.nodes[&id].composed.parts["Popup"];
    let rect=s.nodes[&popup].rect;
    assert!(rect.height>90.,"all three choices need a window-sized popup, got {rect:?}");
    assert!(rect.y>=-120.&&rect.y+rect.height<=880.);
}
use winui_wasm::scene::composed::ComposedAction;
fn action(s: &mut Scene, id: u32, a: ComposedAction) {
    s.input(
        Input::Composed {
            id,
            action: a,
            index: None,
            request: None,
            cancel: false,
        },
        0.,
    )
    .unwrap();
    frame(s, 0.);
}
#[test]
fn number_template_commit_step_empty_and_range() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::NumberBox,json!({"numberValue":3,"minimum":0,"maximum":5,"width":200,"spinButtonPlacementMode":"Inline"})).unwrap();
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&id].props.text, "3");
    action(&mut s, id, ComposedAction::Increment);
    assert_eq!(s.nodes[&id].props.number_value, Some(4.));
    patch(
        &mut s,
        id,
        json!({"text":"2 + 3 * 4","acceptsExpression":true}),
    );
    action(&mut s, id, ComposedAction::Submit);
    assert_eq!(s.nodes[&id].props.number_value, Some(5.));
    patch(&mut s, id, json!({"text":""}));
    action(&mut s, id, ComposedAction::Submit);
    assert_eq!(s.nodes[&id].props.number_value, None);
    action(&mut s, id, ComposedAction::Increment);
    assert_eq!(s.nodes[&id].props.number_value, None);
}

#[test]
fn number_focus_loss_keeps_committed_value_and_emits_one_change() {
    for external_blur in [false, true] {
        for (initial, text, expected, display) in [
            (Some(42.), "27", Some(27.), "27"),
            (None, "-12.5", Some(-12.5), "-12.5"),
            (Some(42.), "1 + 2^2", Some(5.), "5"),
            (Some(42.), "200", Some(100.), "100"),
            (Some(42.), "", None, ""),
            (Some(42.), "bad", Some(42.), "42"),
            (None, "bad", None, ""),
        ] {
            let mut s = scene();
            let id = s.create(s.root, NodeKind::NumberBox,
                json!({"numberValue":initial,"acceptsExpression":true,"maximum":100,"width":240})).unwrap();
            let outside = s.create(s.root, NodeKind::Button, json!({"text":"Outside"})).unwrap();
            frame(&mut s, 0.);
            action(&mut s, id, ComposedAction::Focus);
            let input = s.nodes[&id].composed.parts["InputBox"];
            s.input(Input::Edit { id: input, text: text.into(), start: text.len(), length: 0,
                input_type: "insertText".into() }, 1.).unwrap();
            frame(&mut s, 1.);
            assert_eq!(s.nodes[&id].props.number_value, initial, "draft must stay uncommitted");
            s.snapshot();
            s.input(if external_blur { Input::Blur } else { Input::Focus { id: outside } }, 2.).unwrap();
            frame(&mut s, 2.);
            frame(&mut s, 3.);
            assert_eq!(s.nodes[&id].props.number_value, expected, "blur={external_blur}, text={text:?}");
            assert_eq!(s.nodes[&id].props.text, display);
            assert_eq!(s.nodes[&input].props.text, display);
            let changes: Vec<_> = s.snapshot().events.into_iter()
                .filter(|event| event.target == id && event.kind == EventKind::ValueChanged).collect();
            assert_eq!(changes.len(), usize::from(initial != expected));
            if let Some(event) = changes.first() {
                let payload = event.payload.as_ref().unwrap();
                assert_eq!(payload["oldValue"], json!(initial));
                assert_eq!(payload["newValue"], json!(expected));
            }
        }
    }
}

#[test]
fn combo_hover_border_retains_absolute_native_gradient_and_keyboard_hover_fill() {
    use winui_wasm::{resources::Resources,model::Rect,render::Draw};
    for theme in [Theme::Light, Theme::Dark] {
        let resources=Resources::current();
        let normal=resources.resolve(theme,"ComboBoxBorderBrush").unwrap();
        let hover=resources.resolve(theme,"ComboBoxBorderBrushPointerOver").unwrap();
        assert_eq!(hover.mapping_mode,"Absolute");
        assert_eq!(hover.gradient_points(Rect::new(0.,0.,240.,32.)),normal.gradient_points(Rect::new(0.,0.,240.,32.)));
        let mut s=Scene::new(theme,true);s.resize(500.,300.,1.25).unwrap();
        let canvas=s.create(s.root,NodeKind::Canvas,json!({})).unwrap();
        let id=s.create(canvas,NodeKind::ComboBox,json!({"width":240,"canvasLeft":24,"canvasTop":24,"collectionItems":[{"id":"a","text":"Green"}],"selectedIndex":0})).unwrap();
        frame(&mut s,0.);action(&mut s,id,ComposedAction::Focus);
        s.input(Input::Move{x:100.,y:40.,pointer:1},0.).unwrap();frame(&mut s,0.);
        let expected=resources.resolve(theme,"ComboBoxBackgroundPointerOver").unwrap().solid_color();
        assert!(s.display_list().iter().any(|draw|matches!(draw,Draw::Fill{color,rect,..} if color==&expected&&rect.width>230.&&rect.width<240.)),"keyboard focus must not mask CommonStates.PointerOver");
    }
}

#[test]
fn combo_scroll_scope_consumes_background_and_list_edges_without_large_surfaces() {
    let mut s=scene();let canvas=s.create(s.root,NodeKind::Canvas,json!({})).unwrap();
    let background=s.create(canvas,NodeKind::ScrollViewer,json!({"canvasLeft":300,"canvasTop":0,"width":180,"height":200})).unwrap();
    s.create(background,NodeKind::Border,json!({"height":1500})).unwrap();
    let items=(0..50).map(|i|json!({"id":i.to_string(),"text":format!("Choice {i}")})).collect::<Vec<_>>();
    let id=s.create(canvas,NodeKind::ComboBox,json!({"width":200,"canvasLeft":24,"canvasTop":40,"maxDropDownHeight":100,"collectionItems":items})).unwrap();
    frame(&mut s,0.);assert!(s.wheel(350.,60.,0.,20.,false).unwrap());let offset=s.nodes[&background].props.vertical_offset;
    action(&mut s,id,ComposedAction::Open);let popup=s.background_scroll_root().unwrap();
    assert_eq!(s.snapshot().background_scroll_root,Some(popup));
    assert!(s.wheel(350.,60.,0.,200.,false).unwrap());assert_eq!(s.nodes[&background].props.vertical_offset,offset);
    let (x,y)=s.nodes[&popup].world.point(12.,12.);assert!(s.wheel(x,y,0.,100000.,false).unwrap());
    let list=s.nodes[&id].composed.parts["ItemsPresenter"];assert!(s.nodes[&list].props.vertical_offset>0.);
    assert!(s.wheel(x,y,0.,100000.,false).unwrap());assert_eq!(s.nodes[&background].props.vertical_offset,offset);
    let bounds=s.floating_surface_bounds();assert!(bounds.width<300.&&bounds.height<200.);
    let snap=s.snapshot();assert!(snap.nodes.iter().find(|n|n.id==id).unwrap().props.collection_items.is_empty());assert_eq!(s.nodes[&id].props.collection_items.len(),50);
    action(&mut s,id,ComposedAction::Close);assert!(s.background_scroll_root().is_none());assert!(s.wheel(350.,60.,0.,200.,false).unwrap());assert!(s.nodes[&background].props.vertical_offset>offset);
}

#[test]
fn number_clear_follows_nonempty_focus_after_programmatic_updates() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::NumberBox,
            json!({"numberValue":42,"width":240,"spinButtonPlacementMode":"Inline"}),
        )
        .unwrap();
    let outside = s
        .create(s.root, NodeKind::Button, json!({"text":"Outside"}))
        .unwrap();
    frame(&mut s, 0.);
    let input = s.nodes[&id].composed.parts["InputBox"];
    let visible = |s: &mut Scene| {
        s.snapshot()
            .nodes
            .into_iter()
            .find(|n| n.id == input)
            .unwrap()
            .editor
            .unwrap()
            .helper_button
            .is_some()
    };
    action(&mut s, id, ComposedAction::Focus);
    assert!(
        visible(&mut s),
        "a populated NumberBox exposes clear on its first focus"
    );
    for value in [17, 27] {
        patch(&mut s, id, json!({"numberValue":value}));
        s.input(Input::Focus { id: outside }, 0.).unwrap();
        frame(&mut s, 0.);
        assert!(!visible(&mut s));
        action(&mut s, id, ComposedAction::Focus);
        assert!(
            visible(&mut s),
            "programmatic updates must not suppress clear on refocus"
        );
    }
    patch(&mut s, id, json!({"numberValue":null}));
    frame(&mut s, 0.);
    assert!(!visible(&mut s));
}
#[test]
fn all_templates_layout_and_content_ownership() {
    for kind in [
        NodeKind::NumberBox,
        NodeKind::AutoSuggestBox,
        NodeKind::ComboBox,
        NodeKind::ContentDialog,
        NodeKind::TeachingTip,
    ] {
        let mut s = scene();
        let id = s.create(s.root, kind, json!({})).unwrap();
        frame(&mut s, 0.);
        let parts = s.nodes[&id].composed.parts.clone();
        assert!(!parts.is_empty());
        if matches!(kind, NodeKind::ContentDialog | NodeKind::TeachingTip) {
            let child = s
                .create(id, NodeKind::TextBlock, json!({"text":"Rich content"}))
                .unwrap();
            assert_eq!(s.nodes[&child].parent, parts.get("Content").copied());
        } else {
            assert!(s.create(id, NodeKind::Button, json!({})).is_err());
        }
        assert!(s.destroy(parts["Popup"]).is_err());
        s.destroy(id).unwrap();
        assert_eq!(s.nodes.len(), 1);
    }
}
#[test]
fn suggestion_reason_and_combo_selection() {
    let mut s = scene();
    for kind in [NodeKind::AutoSuggestBox, NodeKind::ComboBox] {
        let id=s.create(s.root,kind,json!({"width":200,"collectionItems":[{"id":"one","text":"One"},{"id":"two","text":"Two"}]})).unwrap();
        frame(&mut s, 0.);
        s.events.clear();
        s.input(
            Input::Composed {
                id,
                action: ComposedAction::Select,
                index: Some(1),
                request: None,
                cancel: false,
            },
            0.,
        )
        .unwrap();
        frame(&mut s, 0.);
        assert_eq!(s.nodes[&id].props.selected_index, 1);
        assert_eq!(s.nodes[&id].props.text, "Two");
        assert!(s.events.iter().any(|e| e.target == id
            && e.kind
                == if kind == NodeKind::ComboBox {
                    EventKind::SelectionChanged
                } else {
                    EventKind::QuerySubmitted
                }));
    }
}
#[test]
fn dialog_button_then_closing_transactions_and_root_exclusivity() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::ContentDialog,
            json!({"title":"Save?","primaryButtonText":"Save","closeButtonText":"Cancel"}),
        )
        .unwrap();
    let other = s
        .create(s.root, NodeKind::ContentDialog, json!({}))
        .unwrap();
    action(&mut s, id, ComposedAction::Open);
    assert!(s
        .input(
            Input::Composed {
                id: other,
                action: ComposedAction::Open,
                index: None,
                request: None,
                cancel: false
            },
            0.
        )
        .is_err());
    action(&mut s, id, ComposedAction::Primary);
    let req = s
        .events
        .iter()
        .rev()
        .find(|e| e.target == id && e.kind == EventKind::PrimaryButtonClick)
        .unwrap()
        .request_id
        .unwrap();
    s.input(
        Input::Composed {
            id,
            action: ComposedAction::Resolve,
            index: None,
            request: Some(req),
            cancel: false,
        },
        0.,
    )
    .unwrap();
    let req = s
        .events
        .iter()
        .rev()
        .find(|e| e.target == id && e.kind == EventKind::Closing)
        .unwrap()
        .request_id
        .unwrap();
    s.input(
        Input::Composed {
            id,
            action: ComposedAction::Resolve,
            index: None,
            request: Some(req),
            cancel: true,
        },
        0.,
    )
    .unwrap();
    frame(&mut s, 0.);
    assert!(s.nodes[&id].props.is_open);
    action(&mut s, id, ComposedAction::Close);
    let req = s
        .events
        .iter()
        .rev()
        .find(|e| e.target == id && e.kind == EventKind::Closing)
        .unwrap()
        .request_id
        .unwrap();
    s.input(
        Input::Composed {
            id,
            action: ComposedAction::Resolve,
            index: None,
            request: Some(req),
            cancel: false,
        },
        0.,
    )
    .unwrap();
    frame(&mut s, 1.);
    assert!(!s.nodes[&id].props.is_open);
}

#[test]
fn number_format_and_parse_match_native_sdk_records() {
    let reference: serde_json::Value =
        serde_json::from_str(include_str!("../references/composed-number-format.json")).unwrap();
    for row in reference["values"].as_array().unwrap() {
        let mut s = scene();
        let id = s
            .create(
                s.root,
                NodeKind::NumberBox,
                json!({"numberValue":row["value"]}),
            )
            .unwrap();
        frame(&mut s, 0.);
        assert_eq!(
            s.nodes[&id].props.text,
            row["text"].as_str().unwrap(),
            "{:?}",
            row
        );
    }
    for row in reference["inputs"].as_array().unwrap() {
        let mut s = scene();
        let id = s
            .create(
                s.root,
                NodeKind::NumberBox,
                json!({"numberValue":42,"acceptsExpression":row["expression"]}),
            )
            .unwrap();
        patch(&mut s, id, json!({"text":row["text"]}));
        frame(&mut s, 0.);
        assert_eq!(
            s.nodes[&id].props.number_value,
            row["value"].as_f64(),
            "{:?}",
            row
        );
        assert_eq!(
            s.nodes[&id].props.text,
            row["display"].as_str().unwrap(),
            "{:?}",
            row
        );
    }
}
#[test]
fn number_disabled_validation_wrap_and_locale_boundary() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::NumberBox,
            json!({"numberValue":5,"minimum":0,"maximum":5,"isWrapEnabled":true}),
        )
        .unwrap();
    action(&mut s, id, ComposedAction::Increment);
    assert_eq!(s.nodes[&id].props.number_value, Some(0.));
    action(&mut s, id, ComposedAction::Decrement);
    assert_eq!(s.nodes[&id].props.number_value, Some(5.));
    patch(
        &mut s,
        id,
        json!({"validationMode":"Disabled","text":"bad"}),
    );
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&id].props.text, "bad");
    assert_eq!(s.nodes[&id].props.number_value, Some(5.));
    patch(
        &mut s,
        id,
        json!({"numberDecimalSeparator":",","numberGroupSeparator":".","numberUseGrouping":true,"text":"1.234,5","acceptsExpression":true}),
    );
    action(&mut s, id, ComposedAction::Submit);
    assert_eq!(s.nodes[&id].props.number_value, Some(1234.5));
    assert_eq!(s.nodes[&id].props.text, "1.234,5");
}
#[test]
fn pending_dialog_prevents_double_requests_and_restores_original_focus() {
    let mut s = scene();
    let button = s
        .create(s.root, NodeKind::Button, json!({"text":"Open"}))
        .unwrap();
    frame(&mut s, 0.);
    s.input(Input::Focus { id: button }, 0.).unwrap();
    let dialog = s
        .create(
            s.root,
            NodeKind::ContentDialog,
            json!({"primaryButtonText":"Save","defaultButton":"Primary"}),
        )
        .unwrap();
    action(&mut s, dialog, ComposedAction::Open);
    action(&mut s, dialog, ComposedAction::Primary);
    let count = s
        .events
        .iter()
        .filter(|e| e.target == dialog && e.kind == EventKind::PrimaryButtonClick)
        .count();
    action(&mut s, dialog, ComposedAction::Primary);
    assert_eq!(
        count,
        s.events
            .iter()
            .filter(|e| e.target == dialog && e.kind == EventKind::PrimaryButtonClick)
            .count()
    );
    let request = s
        .events
        .iter()
        .rev()
        .find(|e| e.target == dialog && e.kind == EventKind::PrimaryButtonClick)
        .unwrap()
        .request_id;
    s.input(
        Input::Composed {
            id: dialog,
            action: ComposedAction::Resolve,
            index: None,
            request,
            cancel: false,
        },
        0.,
    )
    .unwrap();
    let request = s
        .events
        .iter()
        .rev()
        .find(|e| e.target == dialog && e.kind == EventKind::Closing)
        .unwrap()
        .request_id;
    s.input(
        Input::Composed {
            id: dialog,
            action: ComposedAction::Resolve,
            index: None,
            request,
            cancel: false,
        },
        0.,
    )
    .unwrap();
    frame(&mut s, 1.);
    assert_eq!(s.snapshot().focused, Some(button));
}
#[test]
fn combo_programmatic_selection_notifies_and_can_clear() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::ComboBox,
            json!({"collectionItems":[{"id":"a","text":"Alpha"},{"id":"b","text":"Beta"}]}),
        )
        .unwrap();
    frame(&mut s, 0.);
    s.events.clear();
    patch(&mut s, id, json!({"selectedIndex":1}));
    frame(&mut s, 0.);
    assert!(s
        .events
        .iter()
        .any(|e| e.target == id && e.kind == EventKind::SelectionChanged));
    assert_eq!(s.nodes[&id].props.text, "Beta");
    patch(&mut s, id, json!({"selectedIndex":-1}));
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&id].props.text, "");
}

#[test]
fn native_quarter_increment_formatter_preserves_value() {
    let reference: serde_json::Value =
        serde_json::from_str(include_str!("../references/composed-number-format.json")).unwrap();
    for row in reference["increments"].as_array().unwrap() {
        let mut s = scene();
        let id=s.create(s.root,NodeKind::NumberBox,json!({"numberValue":row["value"],"numberRoundingIncrement":0.25,"numberMinFractionDigits":2})).unwrap();
        frame(&mut s, 0.);
        assert_eq!(s.nodes[&id].props.text, row["text"].as_str().unwrap());
        assert_eq!(s.nodes[&id].props.number_value, row["value"].as_f64());
    }
}

#[test]
fn composed_brushes_resolve_in_all_themes_and_states() {
    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
        for kind in [
            NodeKind::NumberBox,
            NodeKind::AutoSuggestBox,
            NodeKind::ComboBox,
            NodeKind::ContentDialog,
            NodeKind::TeachingTip,
        ] {
            let mut s = Scene::new(theme, false);
            s.resize(800., 600., 1.25).unwrap();
            let id=s.create(s.root,kind,json!({"width":240,"numberValue":42,"spinButtonPlacementMode":"Inline","collectionItems":[{"id":"a","text":"One"},{"id":"b","text":"Two"}],"text":"One","primaryButtonText":"Save","secondaryButtonText":"Don't save","closeButtonText":"Cancel","actionButtonContent":"Learn more","title":"Title","subtitle":"Description"})).unwrap();
            if kind == NodeKind::ComboBox {
                patch(&mut s, id, json!({"isEditable":true}));
            }
            for enabled in [true, false] {
                patch(&mut s, id, json!({"enabled":enabled}));
                frame(&mut s, 0.);
                assert!(!s.display_list().is_empty());
            }
            patch(&mut s, id, json!({"enabled":true}));
            if matches!(kind, NodeKind::ComboBox | NodeKind::AutoSuggestBox) {
                patch(
                    &mut s,
                    id,
                    json!({"isDropDownOpen":true,"isSuggestionListOpen":true}),
                );
            }
            if matches!(kind, NodeKind::ContentDialog | NodeKind::TeachingTip) {
                action(&mut s, id, ComposedAction::Open);
            }
            for t in [0., 83., 167., 250., 500.] {
                frame(&mut s, t);
                assert!(!s.display_list().is_empty());
            }
            let parts = s.nodes[&id].composed.parts.clone();
            for key in ["UpSpinButton", "DropDownButton"] {
                if let Some(part) = parts.get(key) {
                    for (hover, pressed) in [(true, false), (true, true)] {
                        s.nodes.get_mut(part).unwrap().button.pointer_inside = hover;
                        s.nodes.get_mut(part).unwrap().button.pressed = pressed;
                        assert!(!s.display_list().is_empty());
                    }
                }
            }
        }
    }
}

#[test]
fn combo_selection_does_not_reanchor_the_closing_popup() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(800., 500., 1.25).unwrap();
    let canvas = s.create(s.root, NodeKind::Canvas, json!({})).unwrap();
    let id=s.create(canvas,NodeKind::ComboBox,json!({"width":240,"canvasLeft":24,"canvasTop":140,"selectedIndex":2,"collectionItems":[{"id":"blue","text":"Blue"},{"id":"green","text":"Green"},{"id":"red","text":"Red"},{"id":"yellow","text":"Yellow"}]})).unwrap();
    patch(&mut s, id, json!({"isDropDownOpen":true}));
    frame(&mut s, 0.);
    frame(&mut s, 500.);
    let popup = s.nodes[&id].composed.parts["Popup"];
    let opened = s.nodes[&popup].rect;
    patch(
        &mut s,
        id,
        json!({"selectedIndex":0,"isDropDownOpen":false}),
    );
    frame(&mut s, 501.);
    assert_eq!(
        s.nodes[&popup].rect, opened,
        "selection must not move the already arranged popup during SplitClose"
    );
    let snap = s.snapshot();
    let visual = snap
        .nodes
        .iter()
        .find(|n| n.id == popup)
        .unwrap()
        .overlay
        .as_ref()
        .unwrap();
    assert!(
        !visual.is_open && !visual.active && visual.opacity == 0.,
        "windowed ComboBox cancels unloading animation without a residual popup"
    );
    frame(&mut s, 800.);
    patch(&mut s, id, json!({"isDropDownOpen":true}));
    frame(&mut s, 801.);
    assert_ne!(
        s.nodes[&popup].rect.y, opened.y,
        "a new opening aligns to the new selected item"
    );
}

#[test]
fn targeted_teaching_tip_uses_window_bounds_when_its_scene_is_near_the_screen_bottom() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(800., 520., 1.25).unwrap();
    s.popup_viewport = Some(winui_wasm::model::Rect::new(0., -900., 800., 1000.));
    let canvas = s.create(s.root, NodeKind::Canvas, json!({})).unwrap();
    let target = s.create(canvas, NodeKind::Button, json!({"text":"Target","canvasLeft":220,"canvasTop":24})).unwrap();
    let tip = s.create(canvas, NodeKind::TeachingTip, json!({"placementTarget":target,"preferredPlacement":"Bottom","title":"Title","text":"A teaching tip"})).unwrap();
    action(&mut s, tip, ComposedAction::Open);
    frame(&mut s, 0.);
    let popup = s.nodes[&tip].composed.parts["Popup"];
    let r = s.nodes[&popup].rect;
    assert!(r.y < 0., "fallback may extend above the Scene in its popup island");
    assert!(r.y + r.height <= 100.);
}

#[test]
fn editable_combo_arrow_hit_area_stretches_with_the_editor_height() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(800., 500., 1.25).unwrap();
    let id = s.create(s.root, NodeKind::ComboBox, json!({"width":240,"isEditable":true,"text":"14"})).unwrap();
    frame(&mut s, 0.);
    let parts = s.nodes[&id].composed.parts.clone();
    s.input(Input::Focus { id: parts["InputBox"] }, 0.).unwrap();
    frame(&mut s, 10.);
    let input = s.nodes[&parts["InputRoot"]].rect;
    let arrow = s.nodes[&parts["DropDownButton"]].rect;
    assert_eq!(arrow.height, input.height);
    assert!(arrow.height - 8. >= 24.);
}
