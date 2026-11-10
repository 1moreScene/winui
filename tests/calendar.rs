use winui_wasm::{
    calendar::{festivals, lunar_day, solar_term},
    enums::CalendarIdentifier as Cal,
    picker_value::Date,
};

fn date(value: &str) -> Date {
    Date::parse(value).unwrap()
}
const CALENDARS: [Cal; 11] = [
    Cal::Gregorian,
    Cal::Japanese,
    Cal::Julian,
    Cal::Korean,
    Cal::Taiwan,
    Cal::Thai,
    Cal::Hebrew,
    Cal::Hijri,
    Cal::UmAlQura,
    Cal::Persian,
    Cal::Chinese,
];

#[test]
fn calendars_convert_real_fields_and_round_trip_civil_days() {
    let sample = date("2026-11-10");
    for (cal, year) in [
        (Cal::Gregorian, 2026),
        (Cal::Korean, 4359),
        (Cal::Taiwan, 115),
        (Cal::Thai, 2569),
        (Cal::Hebrew, 5787),
        (Cal::Persian, 1405),
    ] {
        assert_eq!(cal.fields(sample).year, year, "{cal:?}");
    }
    assert_eq!(Cal::Japanese.fields(sample).era, "reiwa");
    assert_eq!(Cal::Japanese.fields(sample).era_year, 8);
    assert_eq!(Cal::Julian.fields(sample).day, 28);
    for cal in CALENDARS {
        for year in [1901, 2000, 2023, 2025, 2026, 2033, 2099, 2100] {
            for month in 1..=12 {
                let d = Date::new(year, month, Date::month_days(year, month)).unwrap();
                let f = cal.fields(d);
                assert_eq!(cal.date(f.year, f.month, f.day), d, "{cal:?} {d:?}");
                let next = cal.add_months(cal.month_start(d), 1);
                assert_eq!(
                    next.ordinal() - cal.month_start(d).ordinal(),
                    f.days_in_month as i32
                );
                assert_eq!(cal.months_between(cal.month_start(d), next), 1);
            }
        }
    }
}

#[test]
fn chinese_new_year_leap_month_and_short_new_year_eve() {
    let new_year = Cal::Chinese.fields(date("2026-02-17"));
    assert_eq!(
        (new_year.year, new_year.month_number, new_year.day),
        (2026, 1, 1)
    );
    assert!(festivals(date("2026-02-17")).contains(&"春节".into()));
    let eve = Cal::Chinese.fields(date("2026-02-16"));
    assert_eq!(eve.day, 29);
    assert!(festivals(date("2026-02-16")).contains(&"除夕".into()));
    let leap = Cal::Chinese.fields(date("2025-07-25"));
    assert_eq!(
        (
            leap.month_number,
            leap.day,
            leap.leap_month,
            leap.months_in_year
        ),
        (6, 1, true, 13)
    );
    assert_eq!(lunar_day(date("2025-07-25")), "闰六月");
    assert_eq!(
        Cal::Chinese.add_months(date("2025-06-25"), 1),
        date("2025-07-25")
    );
    assert_eq!(
        Cal::Chinese.add_months(date("2025-07-25"), 1),
        date("2025-08-23")
    );
    assert!(Cal::Chinese.fields(date("2033-12-22")).leap_month);
    assert_eq!(festivals(date("2026-06-19")), vec!["端午节"]);
    assert_eq!(festivals(date("2026-09-25")), vec!["中秋节"]);
}

#[test]
fn solar_terms_match_all_24_hko_2026_civil_dates() {
    // https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2026e.txt
    let expected = [
        "01-05", "01-20", "02-04", "02-18", "03-05", "03-20", "04-05", "04-20", "05-05", "05-21",
        "06-05", "06-21", "07-07", "07-23", "08-07", "08-23", "09-07", "09-23", "10-08", "10-23",
        "11-07", "11-22", "12-07", "12-22",
    ];
    let names = [
        "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种",
        "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪",
        "大雪", "冬至",
    ];
    for (day, name) in expected.iter().zip(names) {
        assert_eq!(solar_term(date(&format!("2026-{day}"))), Some(name));
    }
    assert_eq!(solar_term(date("2026-11-10")), None);
    assert_eq!(solar_term(date("1900-01-05")), None);
    for year in 1901..=2100 {
        let first = Date::new(year, 1, 1).unwrap();
        let end = Date::new(year, 12, 31).unwrap();
        assert_eq!(
            (first.ordinal()..=end.ordinal())
                .filter(|day| solar_term(Date::from_ordinal(*day)).is_some())
                .count(),
            24
        );
    }
}

#[test]
fn leap_months_do_not_repeat_festivals_and_coincident_events_are_retained() {
    // 2020 leap fourth month, not the Dragon Boat Festival month.
    assert!(festivals(date("2020-05-27")).is_empty());
    assert_eq!(festivals(date("2020-10-01")), vec!["国庆节", "中秋节"]);
    assert_eq!(festivals(date("2026-04-05")), vec!["清明节"]);
    assert_eq!(solar_term(date("2026-04-05")), Some("清明"));
    assert!(festivals(date("2026-02-15")).is_empty());
}
