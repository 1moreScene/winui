use winui_wasm::picker_value::{coerce_minutes, parse_time, time_string, Date, Hsv};

#[test]
fn gregorian_days_cross_leap_centuries_without_timezone_or_dst() {
    assert!(Date::parse("1900-02-29").is_err());
    assert!(Date::parse("2000-02-29").is_ok());
    assert_eq!(
        Date::parse("2024-02-28").unwrap().add_days(2).iso(),
        "2024-03-01"
    );
    assert_eq!(
        Date::parse("2024-01-31").unwrap().add_months(1).iso(),
        "2024-02-29"
    );
    assert_eq!(Date::parse("1970-01-01").unwrap().ordinal(), 0);
    assert_eq!(Date::parse("1970-01-01").unwrap().weekday(), 4);
    assert!(Date::parse("+001-01-01").is_err());
    assert!(Date::parse("2026-+1-08").is_err());
    assert_eq!(
        Date::parse("2024-01-31")
            .unwrap()
            .add_months(i32::MAX)
            .iso(),
        "9999-12-31"
    );
    assert_eq!(
        Date::parse("2024-01-31")
            .unwrap()
            .add_months(i32::MIN)
            .iso(),
        "0001-01-31"
    );
    let start = Date::parse("1800-01-01").unwrap().ordinal();
    let end = Date::parse("2400-12-31").unwrap().ordinal();
    for ordinal in start..=end {
        let date = Date::from_ordinal(ordinal);
        assert_eq!(date.ordinal(), ordinal);
        assert_eq!(Date::parse(&date.iso()).unwrap(), date);
    }
}

#[test]
fn time_picker_coerces_within_the_hour_and_zero_increment_means_one() {
    assert_eq!(
        time_string(coerce_minutes(parse_time("14:35").unwrap(), 30)),
        "14:30"
    );
    assert_eq!(
        time_string(coerce_minutes(parse_time("23:59").unwrap(), 7)),
        "23:56"
    );
    assert_eq!(
        time_string(coerce_minutes(parse_time("00:01").unwrap(), 0)),
        "00:01"
    );
    assert!(parse_time("24:00").is_err());
    assert!(parse_time("12:60").is_err());
    assert!(parse_time("9:35").is_err());
    assert!(parse_time("+1:35").is_err());
}

#[test]
fn spectrum_primaries_and_argb_editor_keep_alpha_and_round_trip_channels() {
    for (rgba, h) in [
        ([1., 0., 0., 1.], 0.),
        ([0., 1., 0., 1.], 120.),
        ([0., 0., 1., 1.], 240.),
    ] {
        let hsv = Hsv::from_rgba(rgba);
        assert_eq!(hsv.h, h);
        assert_eq!(hsv.s, 1.);
        assert_eq!(hsv.v, 1.);
        assert_eq!(hsv.rgba(), rgba);
    }
    for r in [0., 0.2, 0.5, 0.8, 1.] {
        for g in [0., 0.2, 0.5, 0.8, 1.] {
            for b in [0., 0.2, 0.5, 0.8, 1.] {
                let rgba = [r, g, b, 0.4];
                let actual = Hsv::from_rgba(rgba).rgba();
                for i in 0..4 {
                    assert!((actual[i] - rgba[i]).abs() < 1e-12);
                }
            }
        }
    }
    let color = Hsv::from_hex("#CC0078D7", true).unwrap();
    assert_eq!(color.hex(true), "#CC0078D7");
    assert_eq!(color.hex(false), "#0078D7");
    assert!(Hsv::from_hex("#GG112233", true).is_none());
}
