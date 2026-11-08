//! Emit Rust-generated fixtures for comparison with same-SDK spectrum captures.
use winui_wasm::{enums::ColorSpectrumShape, picker_spectrum::Spectrum, picker_value::Hsv};
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let output = std::env::args().nth(1).ok_or("Pass an output directory")?;
    std::fs::create_dir_all(&output)?;
    for (name, shape) in [
        ("box", ColorSpectrumShape::Box),
        ("ring", ColorSpectrumShape::Ring),
    ] {
        let spectrum = Spectrum {
            shape,
            ..Spectrum::default()
        };
        let rgba = spectrum.bitmap(
            256,
            Hsv {
                h: 206.5,
                s: 1.,
                v: 0.84,
                a: 0.8,
            },
        )?;
        std::fs::write(
            std::path::Path::new(&output).join(format!("spectrum-{name}.rgba")),
            rgba,
        )?;
    }
    Ok(())
}
