use winui_wasm::material_blur::BlurTile;
#[test]
fn offscreen_popup_does_not_allocate_offscreen_blur_pixels() {
    let tile = BlurTile::new(&[37, 91, 163, 255], [1, 1], 6., [-1e9, -1e9, 1e9, 1e9]);
    assert_eq!(
        tile.sample([0.5, 0.5]).map(|v| (v * 255.).round() as u8),
        [37, 91, 163, 255]
    );
}
#[test]
fn constant_backdrop_survives_both_quantized_passes() {
    let pixels = [37, 91, 163, 255].repeat(80 * 60);
    let tile = BlurTile::new(&pixels, [80, 60], 6., [0.2, 0.2, 0.8, 0.8]);
    for uv in [[0.2, 0.2], [0.4, 0.6], [0.8, 0.8]] {
        let actual = tile.sample(uv).map(|v| (v * 255.).round() as u8);
        assert_eq!(actual, [37, 91, 163, 255]);
    }
}
#[test]
fn popup_bounds_exclude_adjacent_backdrop() {
    let mut pixels = [0, 0, 255, 255].repeat(80 * 60);
    for y in 15..45 {
        for x in 20..60 {
            pixels[(y * 80 + x) * 4..(y * 80 + x + 1) * 4].copy_from_slice(&[255, 0, 0, 255]);
        }
    }
    let tile = BlurTile::new(
        &pixels,
        [80, 60],
        6.,
        [20.5 / 80., 15.5 / 60., 59.5 / 80., 44.5 / 60.],
    );
    for uv in [
        [20.5 / 80., 15.5 / 60.],
        [0.5, 0.5],
        [59.5 / 80., 44.5 / 60.],
    ] {
        assert_eq!(
            tile.sample(uv).map(|v| (v * 255.).round() as u8),
            [255, 0, 0, 255]
        );
    }
}

#[test]
fn prepared_axes_preserve_fractional_sampling_for_color_gray_and_alpha() {
    for gray in [false, true] {
        let mut source = vec![0u8; 17 * 13 * 4];
        for (i, p) in source.chunks_exact_mut(4).enumerate() {
            let v = ((i * 47 + 13) % 256) as u8;
            *p.first_mut().unwrap() = v;
            p[1] = if gray { v } else { v.wrapping_mul(3) };
            p[2] = if gray { v } else { v.wrapping_add(71) };
            p[3] = 255;
        }
        let tile = BlurTile::new(
            &source,
            [17, 13],
            2.8,
            [0.5 / 17., 0.5 / 13., 1. - 0.5 / 17., 1. - 0.5 / 13.],
        );
        assert_eq!(tile.is_opaque_grayscale(), gray);
        for dpr in [1., 1.25, 1.5, 2.] {
            let x = tile.raster_axis(-7.4, 2.1, 31.7 * dpr, 47, 0);
            let y = tile.raster_axis(3.2, -1.3, 24.2 * dpr, 29, 1);
            for (j, ys) in y.iter().enumerate() {
                for (i, xs) in x.iter().enumerate() {
                    let reference = tile.sample([
                        (-7.4 + i as f64 + 0.5 - 2.1) / (31.7 * dpr),
                        (3.2 + j as f64 + 0.5 + 1.3) / (24.2 * dpr),
                    ]);
                    let actual = tile.sample_axes(*xs, *ys);
                    for c in 0..4 {
                        assert!((reference[c] - actual[c]).abs() < 1e-12);
                    }
                    if gray {
                        assert!((reference[0] - tile.gray_axes(*xs, *ys)).abs() < 1e-12);
                    }
                }
            }
        }
    }
}
