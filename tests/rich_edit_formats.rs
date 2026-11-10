use serde_json::json;
use winui_wasm::{
    enums::*,
    render::Draw,
    scene::{
        rich_edit::{
            self, math, objects, rtf, CharacterFormat, EmbeddedImage, RichEditDocument, RichEditRun,
        },
        Input, NodeProperties, Scene, Update,
    },
    typography::{Font, Metrics, TextMeasurer},
};
const XML:&str="<math xmlns=\"http://www.w3.org/1998/Math/MathML\"><mfrac><msup><mi>x</mi><mn>2</mn></msup><msqrt><mi>y</mi></msqrt></mfrac></math>";
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
fn image() -> EmbeddedImage {
    EmbeddedImage::from_bytes(
        "image/png",
        include_bytes!("../references/rich-edit/image-fixture.png"),
        Some([96., 64.]),
    )
    .unwrap()
}
fn scene() -> (Scene, u32) {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(420., 320., 1.25).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::RichEditBox,
            json!({"width":240,"height":200,"text":"before after"}),
        )
        .unwrap();
    (s, id)
}
fn command(s: &mut Scene, id: u32, c: serde_json::Value) -> Result<(), String> {
    s.input(
        serde_json::from_value(json!({"kind":"richEdit","id":id,"command":c})).unwrap(),
        1.,
    )
}
fn select(s: &mut Scene, id: u32, start: usize, length: usize) {
    s.input(
        Input::Select {
            id,
            start,
            length,
            backward: false,
        },
        1.,
    )
    .unwrap();
}
#[test]
fn rtf_unicode_nested_styles_font_color_and_paragraphs() {
    let d=rtf::decode(r"{\rtf1\ansi\deff0{\fonttbl{\f0\fnil Segoe UI;}{\f1\fnil Consolas;}}{\colortbl ;\red255\green0\blue0;}\uc1\pard\qc Normal {\b bold {\i both}} \cf1\f1\fs36\u20013?\u-10179?\u-8638?\par next\par}").unwrap();
    assert_eq!(d.text(), "Normal bold both 中🙂\nnext");
    assert_eq!(d.paragraphs[0].alignment, RichEditAlignment::Center);
    assert!(d
        .runs
        .iter()
        .any(|r| r.text == "both" && r.format.bold == Some(true) && r.format.italic == Some(true)));
    let end = d.runs.iter().find(|r| r.text.contains('中')).unwrap();
    assert_eq!(end.format.foreground.as_deref(), Some("#ff0000"));
    assert_eq!(end.format.font_family.as_deref(), Some("Consolas"));
    assert_eq!(end.format.font_size, Some(24.));
}
#[test]
fn rtf_legacy_codepages_and_unicode_fallback_bytes() {
    let d = rtf::decode(r"{\rtf1\ansi\ansicpg936 \'d6\'d0\'ce\'c4\uc2\u20013\'d6\'d0Z}").unwrap();
    assert_eq!(d.text(), "中文中Z");
    assert_eq!(rtf::decode(r"{\rtf1\ansi caf\'e9}").unwrap().text(), "café");
    assert!(rtf::decode(r"{\rtf1\ansi\ansicpg9999 x}").is_err());
}
#[test]
fn rtf_binary_and_hex_pictures_preserve_bytes_size_and_alt() {
    let pic = image();
    let d = RichEditDocument {
        runs: vec![RichEditRun {
            text: objects::OBJECT.into(),
            image: Some(pic.clone()),
            ..Default::default()
        }],
        ..Default::default()
    };
    let encoded = rtf::encode(&d, &NodeProperties::defaults(NodeKind::RichEditBox)).unwrap();
    assert!(encoded.contains("\\pngblip"));
    let restored = rtf::decode(&encoded).unwrap();
    assert_eq!(restored.runs[0].image, Some(pic.clone()));
    let bytes = pic.bytes().unwrap().1;
    let mut raw = format!(
        "{{\\rtf1\\ansi{{\\pict\\pngblip\\picwgoal1440\\pichgoal960\\bin{} ",
        bytes.len()
    )
    .into_bytes();
    raw.extend(bytes);
    raw.extend(b"}}");
    assert_eq!(
        rtf::decode_bytes(&raw).unwrap().runs[0]
            .image
            .as_ref()
            .unwrap()
            .width,
        96.
    );
}
#[test]
fn rtf_images_math_and_text_roundtrip_without_losing_objects() {
    let d = RichEditDocument {
        runs: vec![
            RichEditRun {
                text: "Hello 中🙂 ".into(),
                format: CharacterFormat {
                    bold: Some(true),
                    ..Default::default()
                },
                ..Default::default()
            },
            RichEditRun {
                text: objects::OBJECT.into(),
                image: Some(image()),
                ..Default::default()
            },
            RichEditRun {
                text: objects::OBJECT.into(),
                mathml: Some(XML.into()),
                ..Default::default()
            },
            RichEditRun {
                text: "\nLast".into(),
                ..Default::default()
            },
        ],
        ..Default::default()
    };
    let encoded = rtf::encode(&d, &NodeProperties::defaults(NodeKind::RichEditBox)).unwrap();
    assert!(encoded.contains("\\moMath"));
    assert!(encoded.contains("\\mdegHide on"));
    assert!(encoded.contains("\\mf"));
    let restored = rtf::decode(&encoded).unwrap();
    assert_eq!(restored.text(), d.text());
    assert_eq!(
        restored.runs.iter().filter(|r| r.image.is_some()).count(),
        1
    );
    assert_eq!(
        restored.runs.iter().find_map(|r| r.mathml.as_deref()),
        Some(XML)
    );
}
#[test]
fn office_math_rtf_without_sdk_metadata_imports_as_formula() {
    let d = rtf::decode(r"{\rtf1\ansi {\mmath{\mf{\mfPr{\mctrlPr}}{\mnum{\mr a}}{\mden{\mr b}}}}}")
        .unwrap();
    let xml = d.runs[0].mathml.as_ref().unwrap();
    assert!(xml.contains("mfrac"));
    assert!(math::parse(xml).is_ok());
}
#[test]
fn rtf_lists_and_empty_trailing_paragraph_survive_roundtrip() {
    let d = RichEditDocument {
        runs: vec![RichEditRun {
            text: "one\ntwo\n".into(),
            ..Default::default()
        }],
        paragraphs: vec![
            rich_edit::ParagraphFormat {
                list_style: RichEditListStyle::Bullet,
                ..Default::default()
            },
            rich_edit::ParagraphFormat {
                list_style: RichEditListStyle::UpperRoman,
                alignment: RichEditAlignment::Right,
            },
            Default::default(),
        ],
    };
    let restored =
        rtf::decode(&rtf::encode(&d, &NodeProperties::defaults(NodeKind::RichEditBox)).unwrap())
            .unwrap();
    assert_eq!(restored.text(), d.text());
    assert_eq!(restored.paragraphs, d.paragraphs);
}
#[test]
fn rtf_rejects_malformed_or_unsupported_content_without_plaintext_fallback() {
    for bad in [
        "",
        r"{\rtf1 missing",
        r"{\rtf1\u-10179?}",
        r"{\rtf1\u-8638?}",
        r"{\rtf1 \'zz}",
        r"{\rtf1\bin20 a}",
        r"{\rtf1{\object thing}}",
        r"{\rtf1\trowd a\cell}",
        r"{\rtf1\super x}",
        r"{\rtf1{\pict\wmetafile8 abcd}}",
    ] {
        assert!(rtf::decode(bad).is_err(), "{bad}");
    }
}
#[test]
fn embedded_image_validation_and_base64_padding() {
    for bytes in [vec![0], vec![1, 2], vec![1, 2, 3], vec![1, 2, 3, 4]] {
        assert_eq!(
            objects::decode64(&objects::encode64(&bytes)).unwrap(),
            bytes
        );
    }
    for bad in ["A===", "AB==", "AAB=", "AAAA====", "ab!!"] {
        assert!(objects::decode64(bad).is_err(), "{bad}");
    }
    let mut pic = image();
    pic.width = -1.;
    assert!(pic.validate().is_err());
    pic.width = 96.;
    pic.source = "https://example.org/image.png".into();
    assert!(pic.validate().is_err());
}
#[test]
fn mathml_fraction_roots_scripts_matrix_and_namespace_prefixes_have_geometry() {
    for xml in [XML,"<m:math xmlns:m=\"http://www.w3.org/1998/Math/MathML\"><m:mroot><m:mi>x</m:mi><m:mn>3</m:mn></m:mroot></m:math>","<math><mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced></math>","<math><munderover><mo>∑</mo><mi>i</mi><mi>n</mi></munderover></math>"]{let n=math::parse(xml).unwrap();let b=math::layout(&n,&Font::default(),&mut Measure);assert!(b.width>0.&&b.ascent>0.&&b.descent>=0.);}
    let b = math::layout(&math::parse(XML).unwrap(), &Font::default(), &mut Measure);
    assert!(b.ascent + b.descent > 28.);
    let mut draws = vec![];
    b.paint(&mut draws, 0., b.ascent, "#000000", false);
    assert!(draws.iter().any(|d| matches!(d, Draw::Polyline { .. })));
}
#[test]
fn mathml_malformed_arity_namespaces_entities_and_limits_are_errors() {
    for bad in [
        "<math>",
        "<svg/>",
        "<math><mfrac><mi>a</mi></mfrac></math>",
        "<math><unknown/></math>",
        "<math><mspace width=\"nope\"/></math>",
        "<math><mi onclick=\"x\">a</mi></math>",
        "<math xmlns=\"http://evil.invalid\"><mi>a</mi></math>",
        "<!DOCTYPE math [<!ENTITY x 'bad'>]><math><mi>&x;</mi></math>",
    ] {
        assert!(math::parse(bad).is_err(), "{bad}");
    }
}
#[test]
fn image_and_formula_insertion_selection_delete_and_history_are_atomic() {
    let (mut s, id) = scene();
    select(&mut s, id, 7, 0);
    command(&mut s, id, json!({"action":"insertImage","image":image()})).unwrap();
    command(&mut s, id, json!({"action":"insertMathML","mathml":XML})).unwrap();
    assert_eq!(
        s.properties(id).unwrap().text,
        "before \u{fffc}\u{fffc}after"
    );
    select(&mut s, id, 7, 2);
    command(&mut s, id, json!({"action":"replace","text":""})).unwrap();
    assert_eq!(s.properties(id).unwrap().text, "before after");
    s.input(
        Input::EditCommand {
            id,
            command: "undo".into(),
        },
        1.,
    )
    .unwrap();
    assert_eq!(
        s.properties(id)
            .unwrap()
            .document
            .unwrap()
            .runs
            .iter()
            .filter(|r| r.image.is_some() || r.mathml.is_some())
            .count(),
        2
    );
}
#[test]
fn loading_rtf_is_one_undo_step_and_invalid_import_does_not_mutate() {
    let (mut s, id) = scene();
    command(
        &mut s,
        id,
        json!({"action":"loadRtf","rtf":r"{\rtf1\ansi {\b imported}\par}"}),
    )
    .unwrap();
    assert_eq!(s.properties(id).unwrap().text, "imported");
    s.input(
        Input::EditCommand {
            id,
            command: "undo".into(),
        },
        1.,
    )
    .unwrap();
    assert_eq!(s.properties(id).unwrap().text, "before after");
    let before = serde_json::to_value(s.properties(id).unwrap()).unwrap();
    assert!(command(
        &mut s,
        id,
        json!({"action":"loadRtf","rtf":r"{\rtf1{\object bad}}"})
    )
    .is_err());
    assert_eq!(
        serde_json::to_value(s.properties(id).unwrap()).unwrap(),
        before
    );
}
#[test]
fn inline_objects_drive_line_height_paint_requests_and_fractional_dpr_reflow() {
    let (mut s, id) = scene();
    select(&mut s, id, 0, 0);
    command(&mut s, id, json!({"action":"insertImage","image":image()})).unwrap();
    command(&mut s, id, json!({"action":"insertMathML","mathml":XML})).unwrap();
    s.layout(&mut Measure);
    let draws = s.display_list();
    assert!(draws
        .iter()
        .any(|d| matches!(d,Draw::Image{rect,..}if rect.width==96.&&rect.height==64.)));
    assert!(draws.iter().any(|d| matches!(d, Draw::Polyline { .. })));
    assert!(s.image_sources().contains(&image().source));
    let n = s.snapshot().nodes.into_iter().find(|n| n.id == id).unwrap();
    assert!(n.editor.unwrap().caret.height >= 64.);
    s.update(vec![Update {
        id,
        patch: json!({"width":130}),
    }])
    .unwrap();
    s.resize(420., 320., 1.5).unwrap();
    s.layout(&mut Measure);
    assert!(s.nodes[&id].editor.text_height >= 64.);
}
#[test]
fn reactive_initial_sources_share_validation_and_reject_ambiguous_updates() {
    let mut s = Scene::new(Theme::Light, true);
    let id = s
        .create(
            s.root,
            NodeKind::RichEditBox,
            json!({"rtf":r"{\rtf1\ansi\b Hello}"}),
        )
        .unwrap();
    assert_eq!(s.properties(id).unwrap().text, "Hello");
    s.update(vec![Update {
        id,
        patch: json!({"mathML":XML}),
    }])
    .unwrap();
    assert_eq!(s.properties(id).unwrap().text, objects::OBJECT);
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"rtf":r"{\rtf1 a}","mathML":XML})
        }])
        .is_err());
}
#[test]
fn jpeg_and_natural_image_dimensions_are_preserved() {
    let jpeg = EmbeddedImage::from_bytes(
        "image/jpeg",
        include_bytes!("../references/rich-edit/image-fixture.jpg"),
        None,
    )
    .unwrap();
    assert_eq!((jpeg.width, jpeg.height), (32., 16.));
    let d = RichEditDocument {
        runs: vec![RichEditRun {
            text: objects::OBJECT.into(),
            image: Some(jpeg.clone()),
            ..Default::default()
        }],
        ..Default::default()
    };
    let out = rtf::encode(&d, &NodeProperties::defaults(NodeKind::RichEditBox)).unwrap();
    assert!(out.contains("\\jpegblip"));
    assert_eq!(rtf::decode(&out).unwrap().runs[0].image, Some(jpeg));
    let (mut s, id) = scene();
    command(
        &mut s,
        id,
        json!({"action":"insertImage","image":{"source":image().source,"width":24}}),
    )
    .unwrap();
    let img = s.properties(id).unwrap().document.unwrap().runs[0]
        .image
        .clone()
        .unwrap();
    assert_eq!((img.width, img.height), (24., 16.));
}
#[test]
fn png_validation_rejects_truncation_and_checksum_damage() {
    let mut bytes = include_bytes!("../references/rich-edit/image-fixture.png").to_vec();
    assert!(objects::image_size("image/png", &bytes[..33]).is_err());
    bytes[40] ^= 1;
    assert!(objects::image_size("image/png", &bytes).is_err());
}
#[test]
fn mathml_export_preserves_namespace_bindings_and_does_not_drop_images() {
    let prefixed = "<m:math xmlns:m=\"http://www.w3.org/1998/Math/MathML\"><m:mi>x</m:mi></m:math>";
    let d = RichEditDocument {
        runs: vec![
            RichEditRun {
                text: "A & B".into(),
                ..Default::default()
            },
            RichEditRun {
                text: objects::OBJECT.into(),
                mathml: Some(prefixed.into()),
                ..Default::default()
            },
        ],
        ..Default::default()
    };
    let xml = math::document_xml(&d);
    assert!(math::parse(&xml).is_ok());
    assert!(xml.contains("A &amp; B"));
    let (mut s, id) = scene();
    command(&mut s, id, json!({"action":"insertImage","image":image()})).unwrap();
    assert!(s.rich_edit_mathml(id).is_err());
}
#[test]
fn unicode_input_composition_and_selection_copy_keep_image_and_math_objects() {
    let (mut s, id) = scene();
    select(&mut s, id, 7, 0);
    command(&mut s, id, json!({"action":"insertImage","image":image()})).unwrap();
    command(&mut s, id, json!({"action":"insertMathML","mathml":XML})).unwrap();
    select(&mut s, id, 7, 0);
    for active in [true, false] {
        s.input(
            Input::EditComposition {
                id,
                text: "before 中\u{fffc}\u{fffc}after".into(),
                active,
                start: 8,
                length: 0,
            },
            1.,
        )
        .unwrap();
    }
    let document = s.properties(id).unwrap().document.unwrap();
    assert_eq!(
        document
            .runs
            .iter()
            .filter(|r| r.image.is_some() || r.mathml.is_some())
            .count(),
        2
    );
    let copied = document.selection(8, 2);
    assert_eq!(copied.runs.len(), 2);
    assert!(copied.plain_text().contains("Image"));
    assert!(copied.plain_text().contains("sqrt"));
    select(&mut s, id, 0, 0);
    command(
        &mut s,
        id,
        json!({"action":"replaceDocument","document":copied}),
    )
    .unwrap();
    assert_eq!(
        s.properties(id)
            .unwrap()
            .document
            .unwrap()
            .runs
            .iter()
            .filter(|r| r.image.is_some() || r.mathml.is_some())
            .count(),
        4
    );
}
#[test]
fn object_import_readonly_limits_and_failed_batches_leave_content_and_history_intact() {
    let (mut s, id) = scene();
    s.update(vec![Update {
        id,
        patch: json!({"isReadOnly":true}),
    }])
    .unwrap();
    command(&mut s, id, json!({"action":"insertImage","image":image()})).unwrap();
    assert_eq!(s.properties(id).unwrap().text, "before after");
    s.update(vec![Update {
        id,
        patch: json!({"isReadOnly":false,"maxLength":12}),
    }])
    .unwrap();
    let before = serde_json::to_value(s.properties(id).unwrap()).unwrap();
    assert!(command(&mut s, id, json!({"action":"insertMathML","mathml":XML})).is_err());
    assert_eq!(
        serde_json::to_value(s.properties(id).unwrap()).unwrap(),
        before
    );
    assert!(s
        .update(vec![
            Update {
                id,
                patch: json!({"rtf":r"{\rtf1 replacement}"})
            },
            Update {
                id,
                patch: json!({"mathML":"<math><mfrac/></math>"})
            }
        ])
        .is_err());
    assert_eq!(s.properties(id).unwrap().text, "before after");
}
#[test]
fn rtf_reader_bounds_nested_groups_and_unknown_ignorable_metadata() {
    let deep = format!("{{\\rtf1 {}x{}}}", "{".repeat(140), "}".repeat(140));
    assert!(rtf::decode(&deep).is_err());
    assert_eq!(
        rtf::decode(r"{\rtf1\ansi A{\*\unknownmeta ignored {\b hidden}}B}")
            .unwrap()
            .text(),
        "AB"
    );
    for i in 0..200 {
        let junk = (0..i % 40)
            .map(|j| {
                [b'{', b'}', b'\\', b'\'', b'0', b'-', b'a'][((i * 7 + j * 13) % 7) as usize]
                    as char
            })
            .collect::<String>();
        assert!(std::panic::catch_unwind(|| rtf::decode(&junk)).is_ok());
    }
}
#[test]
fn pinned_winui_exported_rtf_with_image_and_office_math_imports() {
    let image_doc =
        rtf::decode_bytes(include_bytes!("../references/rich-edit/native-image.rtf")).unwrap();
    assert!(image_doc.runs.iter().any(|r| r.image.is_some()));
    let math_doc =
        rtf::decode_bytes(include_bytes!("../references/rich-edit/native-math.rtf")).unwrap();
    let run = math_doc.runs.iter().find(|r| r.mathml.is_some()).unwrap();
    assert_eq!(run.format.font_size, Some(24.));
    assert!(run.mathml.as_ref().unwrap().contains("mfrac"));
}
#[test]
fn mathml_entities_resolve_without_dtd_and_cdata_stays_literal() {
    let xml = "<math><mrow><mi>&alpha;</mi><mo>&InvisibleTimes;</mo><mi>&pi;</mi></mrow></math>";
    let n = math::parse(xml).unwrap();
    assert_eq!(math::plain_text(&n), "α\u{2062}π");
    assert!(roxmltree::Document::parse(&math::canonical(xml).unwrap()).is_ok());
    assert_eq!(
        math::plain_text(&math::parse("<math><mtext><![CDATA[&alpha;]]></mtext></math>").unwrap()),
        "&alpha;"
    );
}

#[test]
fn mathml_style_inherits_through_rows() {
    let n=math::parse("<math><mstyle mathvariant=\"normal\"><mi>x</mi></mstyle><mstyle mathvariant=\"double-struck\"><mrow><mi>H</mi></mrow></mstyle></math>").unwrap();
    let mut draws = vec![];
    math::layout(&n, &Font::default(), &mut Measure).paint(&mut draws, 0., 20., "#000000", false);
    assert!(draws
        .iter()
        .any(|d| matches!(d,Draw::Text{text,style:FontStyle::Normal,..}if text=="x")));
    assert!(draws
        .iter()
        .any(|d| matches!(d,Draw::Text{text,..}if text=="ℍ")));
}
