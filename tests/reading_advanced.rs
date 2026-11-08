use serde_json::{json, Value};
use winui_wasm::{
    enums::*,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct M;
#[test]
fn overlapping_highlighters_replace_translucent_background_and_foreground() {
    let mut s=scene();s.create(s.root,NodeKind::RichTextBlock,json!({"text":"abc","reading":{"textHighlighters":[{"background":"#ff000080","foreground":"#ff0000","ranges":[{"startIndex":0,"length":3}]},{"background":"#0000ff80","foreground":"#00000000","ranges":[{"startIndex":0,"length":3}]}]}})).unwrap();frame(&mut s);let draws=s.display_list();
    assert_eq!(draws.iter().filter(|d|matches!(d,winui_wasm::render::Draw::Fill{color,..} if color=="#0000ff80")).count(),1);
    assert!(!draws.iter().any(|d|matches!(d,winui_wasm::render::Draw::Fill{color,..} if color=="#ff000080")));
    let text_colors=draws.iter().filter_map(|d|if let winui_wasm::render::Draw::Text{color,..}=d{Some(color.as_str())}else{None}).collect::<Vec<_>>();assert_eq!(text_colors,vec!["#00000000"]);
}
#[test]
fn unfocused_rich_selection_retains_range_and_hides_native_highlight() {
    let mut s = scene();
    let rich = s
        .create(
            s.root,
            NodeKind::RichTextBlock,
            json!({"selectionHighlightColor":"#008000","text":"Selected text"}),
        )
        .unwrap();
    frame(&mut s);
    s.input(
        Input::RichSelect {
            id: rich,
            start: 0,
            length: 8,
        },
        1.,
    )
    .unwrap();
    frame(&mut s);
    let highlighted = |s: &mut Scene| {
        s.display_list()
            .iter()
            .any(|d| matches!(d,winui_wasm::render::Draw::Fill{color,..} if color=="#008000"))
    };
    assert!(!highlighted(&mut s));
    s.input(Input::Focus { id: rich }, 2.).unwrap();
    frame(&mut s);
    assert!(highlighted(&mut s));
    s.input(Input::Blur, 3.).unwrap();
    let f = frame(&mut s);
    assert!(!highlighted(&mut s));
    assert_eq!(node(&f, rich)["reading"]["selectedText"], "Selected");
}
#[test]
fn rich_pointer_click_counts_route_by_rust_hit_test() {
    let mut s = scene();
    let rich = s
        .create(
            s.root,
            NodeKind::RichTextBlock,
            json!({"width":200,"reading":{"paragraphs":[{"runs":[{"text":"Alpha beta\nGamma"}]}]}}),
        )
        .unwrap();
    frame(&mut s);
    let (x, y) = s.nodes[&rich].world.point(3., 3.);
    s.input(
        Input::RichPointerSelection {
            id: 0,
            x,
            y,
            paragraph: false,
        },
        1.,
    )
    .unwrap();
    let f = frame(&mut s);
    assert_eq!(node(&f, rich)["reading"]["selectedText"], "Alpha");
    s.input(
        Input::RichPointerSelection {
            id: 0,
            x,
            y,
            paragraph: true,
        },
        2.,
    )
    .unwrap();
    let f = frame(&mut s);
    assert_eq!(node(&f, rich)["reading"]["selectedText"], "Alpha beta\n");
}
impl TextMeasurer for M {
    fn measure(&mut self, s: &str, f: &Font) -> Metrics {
        Metrics {
            width: s.chars().count() as f64 * f.size / 2.,
            ascent: f.size * 0.8,
            descent: f.size * 0.2,
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(640., 480., 1.25).unwrap();
    s
}
fn frame(s: &mut Scene) -> Value {
    s.layout(&mut M);
    s.display_list();
    serde_json::to_value(s.snapshot()).unwrap()
}
fn node(f: &Value, id: u32) -> &Value {
    f["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == id)
        .unwrap()
}
#[test]
fn rich_selection_utf16_grapheme_copy_and_shrinking_source() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::RichTextBlock,
            json!({"width":250,"reading":{"paragraphs":[{"runs":[{"text":"A👨‍👩‍👧‍👦中B"}]}]}}),
        )
        .unwrap();
    frame(&mut s);
    s.input(
        Input::RichSelect {
            id,
            start: 1,
            length: 11,
        },
        1.,
    )
    .unwrap();
    let f = frame(&mut s);
    assert_eq!(node(&f, id)["reading"]["selectedText"], "👨‍👩‍👧‍👦");
    s.input(Input::Focus { id }, 2.).unwrap();
    s.input(
        Input::KeyDown {
            key: "Ctrl+c".into(),
            repeat: false,
        },
        3.,
    )
    .unwrap();
    let f = frame(&mut s);
    assert!(f["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["kind"] == "CopyRequested" && e["text"] == "👨‍👩‍👧‍👦"));
    s.update(vec![Update {
        id,
        patch: json!({"reading":{"paragraphs":[{"runs":[{"text":"X"}]}]}}),
    }])
    .unwrap();
    let f = frame(&mut s);
    assert_eq!(node(&f, id)["reading"]["selectionLength"], 0);
}
#[test]
fn linked_overflow_reflows_without_losing_text_and_rejects_cycle() {
    let mut s = scene();
    let panel = s
        .create(
            s.root,
            NodeKind::StackPanel,
            json!({"orientation":"Horizontal"}),
        )
        .unwrap();
    let a=s.create(panel,NodeKind::RichTextBlock,json!({"width":80,"height":40,"text":"One two three four five six seven eight nine ten eleven twelve."})).unwrap();
    let b = s
        .create(
            panel,
            NodeKind::RichTextBlockOverflow,
            json!({"width":100,"height":40}),
        )
        .unwrap();
    let c = s
        .create(
            panel,
            NodeKind::RichTextBlockOverflow,
            json!({"width":120,"height":80}),
        )
        .unwrap();
    s.update(vec![
        Update {
            id: a,
            patch: json!({"reading":{"overflowContentTarget":b}}),
        },
        Update {
            id: b,
            patch: json!({"reading":{"overflowContentTarget":c}}),
        },
    ])
    .unwrap();
    let f = frame(&mut s);
    assert!(node(&f, a)["reading"]["hasOverflowContent"]
        .as_bool()
        .unwrap());
    assert_eq!(
        node(&f, b)["reading"]["start"],
        node(&f, a)["reading"]["end"]
    );
    assert_eq!(
        node(&f, c)["reading"]["start"],
        node(&f, b)["reading"]["end"]
    );
    assert!(
        node(&f, c)["reading"]["end"].as_u64().unwrap()
            > node(&f, b)["reading"]["end"].as_u64().unwrap()
    );
    assert!(s
        .update(vec![Update {
            id: c,
            patch: json!({"reading":{"overflowContentTarget":b}})
        }])
        .is_err());
    s.update(vec![Update {
        id: a,
        patch: json!({"width":160}),
    }])
    .unwrap();
    let resized = frame(&mut s);
    assert!(
        node(&resized, a)["reading"]["end"].as_u64().unwrap()
            > node(&f, a)["reading"]["end"].as_u64().unwrap()
    );
}
#[test]
fn inline_sdk_child_is_measured_by_rust_and_destroyed_with_source() {
    let mut s = scene();
    let a=s.create(s.root,NodeKind::RichTextBlock,json!({"width":180,"reading":{"paragraphs":[{"runs":[{"text":"Before "},{"inline":"action"},{"text":" after"}]}]}})).unwrap();
    let inline = s
        .create(a, NodeKind::Grid, json!({"layoutKey":"action"}))
        .unwrap();
    let button = s
        .create(inline, NodeKind::Button, json!({"text":"Save"}))
        .unwrap();
    frame(&mut s);
    assert!(s.nodes[&inline].rect.width > 20.);
    assert!(s.nodes[&inline].rect.x > 0.);
    assert!(s.nodes[&a].desired[1] >= s.nodes[&button].rect.height);
    s.update(vec![Update {
        id: a,
        patch: json!({"reading":{"paragraphs":[{"runs":[{"text":"No inline"}]}]}}),
    }])
    .unwrap();
    frame(&mut s);
    assert!(!s.nodes[&inline].visible);
    assert!(!s.nodes[&button].visible);
    s.destroy(a).unwrap();
    assert!(!s.nodes.contains_key(&inline));
    assert!(!s.nodes.contains_key(&button));
}
#[test]
fn highlighter_uses_utf16_range_and_bidi_keeps_logical_text() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::RichTextBlock,json!({"width":300,"reading":{"paragraphs":[{"runs":[{"text":"abc אבג 123"}]}],"textHighlighters":[{"background":"#ff0000","foreground":"#ffffff","ranges":[{"startIndex":4,"length":3}]}]}})).unwrap();
    let f = frame(&mut s);
    assert_eq!(node(&f, id)["reading"]["text"], "abc אבג 123");
    let draws = serde_json::to_string(&s.display_list()).unwrap();
    assert!(draws.contains("#ff0000"));
    assert!(draws.contains("אבג"));
}
#[test]
fn lined_layout_switches_spacing_and_stretches_in_the_shared_engine() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::ItemsView,json!({"width":300,"height":160,"collectionItems":(0..1000).map(|i|json!({"id":i.to_string(),"text":"Photo"})).collect::<Vec<_>>(),"reading":{"itemAspectRatios":vec![1.5;1000],"layout":{"kind":"LinedFlowLayout","lineHeight":80,"lineSpacing":5,"minItemSpacing":5,"itemsStretch":"Fill"}}})).unwrap();
    let f = frame(&mut s);
    let slots = node(&f, id)["reading"]["slots"].as_array().unwrap();
    assert_eq!(slots.len(), 1000);
    assert!((slots[0]["width"].as_f64().unwrap() * 2. + 5. - 300.).abs() < 1.);
    assert!(s.nodes.len() < 100);
    s.update(vec![Update {
        id,
        patch: json!({"reading":{"layout":{"kind":"StackLayout","spacing":10}}}),
    }])
    .unwrap();
    let f = frame(&mut s);
    assert!(node(&f, id)["reading"]["slots"]
        .as_array()
        .unwrap()
        .is_empty());
}
#[test]
fn annotation_label_collisions_and_item_anchors_are_rust_owned() {
    let mut s = scene();
    let scroll = s
        .create(
            s.root,
            NodeKind::ScrollView,
            json!({"width":250,"height":200}),
        )
        .unwrap();
    let repeater=s.create(scroll,NodeKind::ItemsRepeater,json!({"collectionItems":(0..40).map(|i|json!({"id":i.to_string(),"text":"Color"})).collect::<Vec<_>>(),"repeater":{"layout":{"kind":"UniformGridLayout","minItemWidth":100,"minItemHeight":50}}})).unwrap();
    let bar=s.create(s.root,NodeKind::AnnotatedScrollBar,json!({"width":80,"height":200,"reading":{"scrollTarget":scroll,"labelItemSource":repeater,"labels":[{"text":"Azure","itemIndex":0},{"text":"Cyan","itemIndex":20}]}})).unwrap();
    frame(&mut s);
    let f = frame(&mut s);
    assert_eq!(node(&f, bar)["reading"]["labelSlots"], json!([]));
    let y = s.nodes[&bar].world.0[5] + s.nodes[&bar].reading.rail.y + 40.;
    let x = s.nodes[&bar].world.0[4] + 20.;
    s.input(Input::Move { x, y, pointer: 7 }, 1.).unwrap();
    let f = frame(&mut s);
    assert!(f["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["kind"] == "DetailLabelRequested"));
}
#[test]
fn pager_button_styles_and_command_execution_stay_in_rust() {
    let mut s = scene();
    let command = s.create(s.root, NodeKind::UICommand, json!({})).unwrap();
    let id=s.create(s.root,NodeKind::PagerControl,json!({"reading":{"numberOfPages":5,"nextButtonCommand":command,"nextButtonStyle":{"width":52,"foreground":"#ff0000"}}})).unwrap();
    let f = frame(&mut s);
    let button = node(&f, id)["reading"]["parts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|p| p["role"] == "next")
        .unwrap()["id"]
        .as_u64()
        .unwrap() as u32;
    assert_eq!(s.nodes[&button].props.width, Some(52.));
    s.input(Input::Invoke { id: button }, 1.).unwrap();
    let f = frame(&mut s);
    assert_eq!(node(&f, id)["reading"]["selectedPageIndex"], 1);
    assert!(f["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["target"] == command && e["kind"] == "canExecuteRequested"));
}

#[test]
fn reverse_created_overflow_chain_is_laid_out_in_link_order_and_selection_draws_balance() {
    let mut s = scene();
    let grid=s.create(s.root,NodeKind::Grid,json!({"width":600,"height":120,"columns":[{"unit":"Star"},{"unit":"Star"},{"unit":"Star"}]})).unwrap();
    let third = s
        .create(grid, NodeKind::RichTextBlockOverflow, json!({"column":2}))
        .unwrap();
    let second = s
        .create(
            grid,
            NodeKind::RichTextBlockOverflow,
            json!({"column":1,"reading":{"overflowContentTarget":third}}),
        )
        .unwrap();
    let first=s.create(grid,NodeKind::RichTextBlock,json!({"reading":{"overflowContentTarget":second,"textAlignment":"Justify","paragraphs":[{"runs":[{"text":"One two three four five six seven eight nine ten. ".repeat(30)}]}]}})).unwrap();
    let f = frame(&mut s);
    let a = node(&f, first)["reading"]["end"].as_u64().unwrap();
    let b = node(&f, second)["reading"]["end"].as_u64().unwrap();
    let c = node(&f, third)["reading"]["end"].as_u64().unwrap();
    assert!(a > 0 && b > a && c > b);
    assert_eq!(node(&f, second)["reading"]["start"], a);
    assert_eq!(node(&f, third)["reading"]["start"], b);
    s.input(Input::Focus { id: first }, 0.5).unwrap();
    s.input(
        Input::RichSelect {
            id: first,
            start: 0,
            length: 1000,
        },
        1.,
    )
    .unwrap();
    frame(&mut s);
    let mut stack = 0;
    let mut layers = 0;
    for d in s.display_list() {
        use winui_wasm::render::Draw;
        match d {
            Draw::Save | Draw::Clip { .. } | Draw::RoundedClip { .. } | Draw::CornerClip { .. } => {
                stack += 1
            }
            Draw::Restore => {
                stack -= 1;
                assert!(stack >= 0)
            }
            Draw::Layer { .. } | Draw::WindowLayer { .. } | Draw::VectorLayer { .. } => layers += 1,
            Draw::EndLayer => {
                layers -= 1;
                assert!(layers >= 0)
            }
            _ => {}
        }
    }
    assert_eq!((stack, layers), (0, 0));
    assert!(s
        .create(
            grid,
            NodeKind::RichTextBlock,
            json!({"reading":{"overflowContentTarget":second}})
        )
        .is_err());
}
#[test]
fn annotation_repeat_and_pager_command_gate_updates_are_live() {
    let mut s = scene();
    let bar=s.create(s.root,NodeKind::AnnotatedScrollBar,json!({"width":52,"height":200,"reading":{"maximum":1000,"viewportSize":200,"value":500,"smallChange":10}})).unwrap();
    frame(&mut s);
    let n = &s.nodes[&bar];
    let (x, y) = n.world.point(40., 190.);
    s.input(Input::Down { x, y, pointer: 9 }, 1.).unwrap();
    frame(&mut s);
    s.advance(502.);
    let f = frame(&mut s);
    let requests = f["events"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|e| e["kind"] == "Scrolling")
        .collect::<Vec<_>>();
    assert_eq!(requests.len(), 1);
    assert!(requests
        .iter()
        .all(|e| e["payload"]["scrollingEventKind"] == "DecrementButton"));
    s.input(Input::Cancel { pointer: Some(9) }, 503.).unwrap();
    let f = frame(&mut s);
    assert!(f["nextFrameAt"].is_null());
    let command = s
        .create(
            s.root,
            NodeKind::UICommand,
            json!({"viewControls":{"canExecute":false}}),
        )
        .unwrap();
    let pager = s
        .create(
            s.root,
            NodeKind::PagerControl,
            json!({"reading":{"numberOfPages":5,"nextButtonCommand":command}}),
        )
        .unwrap();
    let f = frame(&mut s);
    let next = node(&f, pager)["reading"]["parts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|p| p["role"] == "next")
        .unwrap()["id"]
        .as_u64()
        .unwrap() as u32;
    assert!(!s.nodes[&next].props.enabled);
    s.update(vec![Update {
        id: command,
        patch: json!({"viewControls":{"canExecute":true}}),
    }])
    .unwrap();
    frame(&mut s);
    assert!(s.nodes[&next].props.enabled);
}

#[test]
fn centered_photo_uses_native_oversized_render_bounds_and_centered_clip() {
    for dpr in [1., 1.25, 1.5] {
        let mut s = scene();
        s.resize(640., 480., dpr).unwrap();
        s.images.insert("square".into(), [500., 500.]);
        let grid = s
            .create(s.root, NodeKind::Grid, json!({"width":150,"height":100}))
            .unwrap();
        let image=s.create(grid,NodeKind::Image,json!({"source":"square","stretch":"UniformToFill","horizontalAlignment":"Center","verticalAlignment":"Center"})).unwrap();
        frame(&mut s);
        let n = &s.nodes[&image];
        assert!((n.rect.y + 25.).abs() < 1. / dpr);
        assert!((n.rect.height - 150.).abs() < 1. / dpr);
        assert!(s.display_list().iter().any(|d|matches!(d,winui_wasm::render::Draw::Clip{rect} if (rect.y-25.).abs()<1./dpr&&(rect.height-100.).abs()<1./dpr)));
    }
}

#[test]
fn native_highlighter_defaults_are_yellow_with_black_text_in_dark_theme() {
    let mut s = Scene::new(Theme::Dark, true);
    s.resize(240., 120., 1.).unwrap();
    s.create(s.root,NodeKind::RichTextBlock,json!({"text":"Highlighted text","reading":{"textHighlighters":[{"ranges":[{"startIndex":0,"length":11}]}]}})).unwrap();
    frame(&mut s);
    let draws = s.display_list();
    assert!(draws
        .iter()
        .any(|d| matches!(d,winui_wasm::render::Draw::Fill{color,..} if color=="#FFFF00FF")));
    assert!(draws
        .iter()
        .any(|d| matches!(d,winui_wasm::render::Draw::Text{color,..} if color=="#000000FF")));
}
