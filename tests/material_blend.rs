use winui_wasm::material::blend_acrylic;

#[test]
fn image_data_channels_follow_clamping_and_even_tie_conversion() {
    use winui_wasm::material::clamp_u8;
    assert_eq!(
        [0.5, 1.5, 2.5, 253.5, 254.5].map(clamp_u8),
        [0, 2, 2, 254, 254]
    );
    assert_eq!(
        [-5., 255.5, f64::INFINITY, f64::NEG_INFINITY, f64::NAN].map(clamp_u8),
        [0, 255, 255, 0, 0]
    );
    assert_eq!(
        [120.499, 120.501, 121.499, 121.501].map(clamp_u8),
        [120, 121, 121, 122]
    );
}

#[test]
fn wrapped_noise_uses_the_same_linear_texel_phase_as_the_gpu() {
    use winui_wasm::material::sample_noise;
    for point in [[0., 0.], [0.5, 0.5], [255.9, -0.25], [16.2, 35.4]] {
        let a = sample_noise(point);
        let b = sample_noise([point[0] + 256., point[1] - 256.]);
        for i in 0..4 {
            assert!((a[i] - b[i]).abs() < 1e-12);
            assert!((0. ..=1.).contains(&a[i]));
        }
    }
    let a = sample_noise([0.5, 0.5]);
    let b = sample_noise([1.5, 0.5]);
    let middle = sample_noise([1., 0.5]);
    for i in 0..4 {
        assert!((middle[i] - (a[i] + b[i]) / 2.).abs() < 1e-12);
    }
}

#[test]
fn floating_point_color_graph_defers_channel_rounding_until_output() {
    let gray = |v: f64| [v / 255.; 3];
    let color = |v: f64, a| [v / 255., v / 255., v / 255., a];
    for (background, tint, opacity, luminosity, expected) in [
        (243., 252., 0., 0.85, 251.),
        (32., 44., 0.15, 0.96, 44.),
        (125., 150., 1., 0., 150.),
    ] {
        let c = blend_acrylic(
            gray(background),
            color(tint, opacity),
            color(tint, luminosity),
        );
        assert_eq!(c.map(|v| (v * 255.).round()), [expected; 3]);
    }
    assert_eq!(
        blend_acrylic([0.2, 0.4, 0.6], color(255., 0.), color(0., 0.)),
        [0.2, 0.4, 0.6]
    );
}

#[test]
fn nonseparable_blends_preserve_luminance_and_bound_saturated_channels() {
    for backdrop in [
        [1., 0., 0.],
        [0., 1., 0.],
        [0., 0., 1.],
        [1., 1., 0.],
        [0., 0., 0.],
        [1., 1., 1.],
    ] {
        for target in [0., 0.05, 0.5, 0.95, 1.] {
            let c = blend_acrylic(backdrop, [0.; 4], [target, target, target, 1.]);
            assert!(c.into_iter().all(|v| (-1e-12..=1. + 1e-12).contains(&v)));
            let l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
            assert!((l - target).abs() < 1e-12);
        }
    }
}
