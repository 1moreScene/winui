use winui_wasm::{
    enums::{ColorSpectrumComponents as Components, ColorSpectrumShape},
    picker_spectrum::Spectrum,
    picker_value::Hsv,
};

#[test]
fn native_spectrum_corners_and_absent_channels_are_preserved() {
    let spectrum = Spectrum::default();
    let color = Hsv {
        h: 120.,
        s: 0.5,
        v: 0.2,
        a: 0.4,
    };
    let pixels = spectrum.bitmap(3, color).unwrap();
    assert_eq!(&pixels[0..4], &[255, 0, 0, 255]);
    assert_eq!(&pixels[24..28], &[255, 255, 255, 255]);
    let hit = spectrum.hit(0., 0., 3, color);
    assert_eq!(hit.h, 0.);
    assert_eq!(hit.s, 1.);
    assert_eq!(hit.v, 0.2);
    assert_eq!(hit.a, 0.4);
    assert_eq!(
        spectrum.position(
            256.,
            Hsv {
                h: 359.,
                s: 0.,
                ..color
            }
        ),
        [256., 256.]
    );
}

#[test]
fn every_box_axis_supports_pointer_selection_and_restricted_bounds() {
    for components in [
        Components::HueSaturation,
        Components::SaturationHue,
        Components::HueValue,
        Components::ValueHue,
        Components::SaturationValue,
        Components::ValueSaturation,
    ] {
        let spectrum = Spectrum {
            components,
            hue: [60., 300.],
            saturation: [0.2, 0.8],
            value: [0.1, 0.9],
            ..Spectrum::default()
        };
        let base = Hsv {
            h: 180.,
            s: 0.5,
            v: 0.5,
            a: 0.3,
        };
        let selection = spectrum.hit(64., 192., 257, base);
        let point = spectrum.position(256., selection);
        assert!((point[0] - 64.).abs() < 1e-9);
        assert!((point[1] - 192.).abs() < 1e-9);
        assert_eq!(selection.a, 0.3);
    }
}

#[test]
fn ring_drag_clamps_to_its_edge_and_zero_ranges_stay_finite() {
    let spectrum = Spectrum {
        shape: ColorSpectrumShape::Ring,
        ..Spectrum::default()
    };
    let color = Hsv {
        h: 0.,
        s: 1.,
        v: 0.3,
        a: 1.,
    };
    assert_eq!(spectrum.position(256., color), [256., 128.]);
    assert_eq!(spectrum.hit(128., 128., 256, color).s, 0.);
    assert!(spectrum.hit(600., 128., 256, color).s > 0.99);
    assert!(spectrum.hit(f64::NAN, 0., 256, color).h.is_finite());
    let fixed = Spectrum {
        hue: [120., 120.],
        saturation: [0.5, 0.5],
        value: [0.5, 0.5],
        ..spectrum
    };
    assert!(fixed.position(256., color).iter().all(|n| n.is_finite()));
    assert_eq!(fixed.hit(0., 0., 256, color).h, 120.);
    assert!(Spectrum {
        hue: [360., 360.],
        ..spectrum
    }
    .bitmap(256, color)
    .is_err());
}
