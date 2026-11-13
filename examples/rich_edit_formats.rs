//! Write a self-contained RTF using the same codec as the WASM SDK.
use winui_wasm::{
    enums::NodeKind,
    scene::{
        rich_edit::{objects, rtf, EmbeddedImage, RichEditDocument, RichEditRun},
        NodeProperties,
    },
};
fn main() -> Result<(), String> {
    let path = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "out/rich-edit-formats/interop.rtf".into());
    let image = EmbeddedImage::from_bytes(
        "image/png",
        include_bytes!("../references/rich-edit/image-fixture.png"),
        Some([96., 64.]),
    )?;
    let doc=RichEditDocument{runs:vec![
        RichEditRun{text:"RTF image and formula\n".into(),..Default::default()},
        RichEditRun{text:objects::OBJECT.into(),image:Some(image),..Default::default()},
        RichEditRun{text:"\n".into(),..Default::default()},
        RichEditRun{text:objects::OBJECT.into(),mathml:Some("<math xmlns=\"http://www.w3.org/1998/Math/MathML\"><mfrac><msup><mi>x</mi><mn>2</mn></msup><msqrt><mi>y</mi></msqrt></mfrac></math>".into()),..Default::default()}
    ],..Default::default()};
    let file = std::path::Path::new(&path);
    if let Some(parent) = file.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(
        file,
        rtf::encode(&doc, &NodeProperties::defaults(NodeKind::RichEditBox))?,
    )
    .map_err(|e| e.to_string())?;
    let only_math = RichEditDocument {
        runs: vec![doc.runs.last().unwrap().clone()],
        ..Default::default()
    };
    std::fs::write(
        file.with_file_name("math.rtf"),
        rtf::encode(&only_math, &NodeProperties::defaults(NodeKind::RichEditBox))?,
    )
    .map_err(|e| e.to_string())?;
    println!("Wrote {}", file.display());
    Ok(())
}
