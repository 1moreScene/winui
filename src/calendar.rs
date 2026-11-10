//! Calendar arithmetic is Rust-owned. ICU4X 2.4 provides calendar conversion;
//! Precomputed civil solar-term dates use UTC+8. Public date values remain Gregorian.
use crate::{enums::CalendarIdentifier, picker_value::Date};
use icu_calendar::{
    cal::{AnyCalendar, AnyCalendarKind},
    options::{DateDifferenceOptions, DateDurationUnit, DateFromFieldsOptions, Overflow},
    types::{DateDuration, DateFields},
    Date as IcuDate,
};
use serde::Serialize;
use std::sync::OnceLock;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarDay {
    /// Stable extended year, independent of Japanese era boundaries.
    pub year: i32,
    pub month: u8,
    pub month_number: u8,
    pub day: u8,
    pub leap_month: bool,
    pub days_in_month: u8,
    pub months_in_year: u8,
    pub era: String,
    pub era_year: i32,
}

impl CalendarIdentifier {
    fn calendar(self) -> AnyCalendar {
        AnyCalendar::new(match self {
            Self::Gregorian | Self::Korean => AnyCalendarKind::Gregorian,
            Self::Japanese => AnyCalendarKind::Japanese,
            Self::Julian => AnyCalendarKind::Julian,
            Self::Taiwan => AnyCalendarKind::Roc,
            Self::Thai => AnyCalendarKind::Buddhist,
            Self::Hebrew => AnyCalendarKind::Hebrew,
            Self::Hijri => AnyCalendarKind::HijriTabularTypeIIFriday,
            Self::UmAlQura => AnyCalendarKind::HijriUmmAlQura,
            Self::Persian => AnyCalendarKind::Persian,
            Self::Chinese => AnyCalendarKind::Chinese,
        })
    }
    fn converted(self, date: Date) -> IcuDate<AnyCalendar> {
        IcuDate::try_new_iso(date.year, date.month, date.day)
            .expect("validated Gregorian date")
            .to_calendar(self.calendar())
    }
    pub fn fields(self, date: Date) -> CalendarDay {
        let d = self.converted(date);
        let month = d.month();
        let era = d.year().era();
        CalendarDay {
            year: d.year().extended_year() + if self == Self::Korean { 2333 } else { 0 },
            month: month.ordinal,
            month_number: month.to_input().number(),
            day: d.day_of_month().0,
            leap_month: month.to_input().is_leap(),
            days_in_month: d.days_in_month(),
            months_in_year: d.months_in_year(),
            era: era.map(|e| e.era.to_string()).unwrap_or_default(),
            era_year: if self == Self::Korean {
                date.year + 2333
            } else {
                era.map(|e| e.year).unwrap_or(d.year().extended_year())
            },
        }
    }
    /// Construct using the ordinal month (including leap months), constraining
    /// missing days/months in the destination year. The result is Gregorian.
    pub fn date(self, year: i32, month: u8, day: u8) -> Date {
        let mut fields = DateFields::default();
        fields.extended_year = Some(year - if self == Self::Korean { 2333 } else { 0 });
        fields.ordinal_month = Some(month);
        fields.day = Some(day);
        let mut options = DateFromFieldsOptions::default();
        options.overflow = Some(Overflow::Constrain);
        let d = IcuDate::try_from_fields(fields, options, self.calendar())
            .expect("calendar fields in supported civil range");
        civil(d)
    }
    pub fn month_start(self, date: Date) -> Date {
        date.add_days(1 - self.fields(date).day as i32)
    }
    pub fn year_start(self, date: Date) -> Date {
        self.date(self.fields(date).year, 1, 1)
    }
    pub fn add_months(self, date: Date, months: i32) -> Date {
        civil(
            self.converted(date)
                .try_added_with_options(DateDuration::for_months(months), Default::default())
                .expect("bounded calendar arithmetic"),
        )
    }
    pub fn add_years(self, date: Date, years: i32) -> Date {
        civil(
            self.converted(date)
                .try_added_with_options(DateDuration::for_years(years), Default::default())
                .expect("bounded calendar arithmetic"),
        )
    }
    pub fn months_between(self, from: Date, to: Date) -> i32 {
        let mut options = DateDifferenceOptions::default();
        options.largest_unit = Some(DateDurationUnit::Months);
        let duration = self
            .converted(from)
            .try_until_with_options(&self.converted(to), options)
            .expect("same calendar");
        duration.months as i32 * if duration.is_negative { -1 } else { 1 }
    }
    pub fn year_label(self, date: Date, suffix: &str) -> String {
        let f = self.fields(date);
        if self == Self::Chinese {
            let stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
            let branches = [
                "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
            ];
            return format!(
                "{}{}{}年",
                f.year,
                stems[(f.year - 4).rem_euclid(10) as usize],
                branches[(f.year - 4).rem_euclid(12) as usize]
            );
        }
        if self == Self::Japanese {
            let era = match f.era.as_str() {
                "reiwa" => "令和",
                "heisei" => "平成",
                "showa" => "昭和",
                "taisho" => "大正",
                "meiji" => "明治",
                v => v,
            };
            return format!("{era}{}{suffix}", f.era_year);
        }
        let era = match self {
            Self::Taiwan => {
                if f.era == "roc" {
                    "民国"
                } else {
                    "民国前"
                }
            }
            Self::Korean => "단기 ",
            Self::Hijri | Self::UmAlQura => {
                if f.era_year > 0 {
                    "AH "
                } else {
                    "BH "
                }
            }
            _ => "",
        };
        format!("{era}{}{suffix}", f.era_year)
    }
    /// Locale Gregorian names are retained only by calendars with those months.
    pub fn month_label(self, date: Date, gregorian: &[String]) -> String {
        let f = self.fields(date);
        match self {
            Self::Chinese => format!(
                "{}{}月",
                if f.leap_month { "闰" } else { "" },
                [
                    "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"
                ][f.month_number as usize - 1]
            ),
            Self::Hebrew => {
                if f.leap_month {
                    "Adar I".into()
                } else if f.month_number == 6 && f.months_in_year == 13 {
                    "Adar II".into()
                } else {
                    [
                        "Tishri", "Heshvan", "Kislev", "Tevet", "Shevat", "Adar", "Nisan", "Iyar",
                        "Sivan", "Tammuz", "Av", "Elul",
                    ][f.month_number as usize - 1]
                        .into()
                }
            }
            Self::Hijri | Self::UmAlQura => [
                "Muharram",
                "Safar",
                "Rabi I",
                "Rabi II",
                "Jumada I",
                "Jumada II",
                "Rajab",
                "Shaban",
                "Ramadan",
                "Shawwal",
                "Dhu al-Qadah",
                "Dhu al-Hijjah",
            ][f.month_number as usize - 1]
                .into(),
            Self::Persian => [
                "Farvardin",
                "Ordibehesht",
                "Khordad",
                "Tir",
                "Mordad",
                "Shahrivar",
                "Mehr",
                "Aban",
                "Azar",
                "Dey",
                "Bahman",
                "Esfand",
            ][f.month_number as usize - 1]
                .into(),
            _ => gregorian[f.month as usize - 1].clone(),
        }
    }
}
fn civil(date: IcuDate<AnyCalendar>) -> Date {
    let d = date.to_calendar(icu_calendar::Iso);
    // Internal arithmetic can cross a public range edge; clamp on return.
    if d.year().extended_year() < 1 {
        return Date::new(1, 1, 1).unwrap();
    }
    if d.year().extended_year() > 9999 {
        return Date::new(9999, 12, 31).unwrap();
    }
    Date::new(
        d.year().extended_year(),
        d.month().ordinal,
        d.day_of_month().0,
    )
    .unwrap()
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SolarTerms {
    first_year: i32,
    last_year: i32,
    names: Vec<String>,
    days: Vec<Vec<u16>>,
}
pub fn solar_term(date: Date) -> Option<&'static str> {
    static DATA: OnceLock<SolarTerms> = OnceLock::new();
    let data = DATA.get_or_init(|| {
        serde_json::from_str(include_str!("../references/chinese-solar-terms.json"))
            .expect("pinned solar-term dates")
    });
    if !(data.first_year..=data.last_year).contains(&date.year) {
        return None;
    }
    let day = (date.ordinal() - Date::new(date.year, 1, 1).unwrap().ordinal() + 1) as u16;
    data.days[(date.year - data.first_year) as usize]
        .iter()
        .position(|v| *v == day)
        .map(|i| data.names[i].as_str())
}
/// Festival names describe the actual day, never a leave period or work shift.
pub fn festivals(date: Date) -> Vec<String> {
    let lunar = CalendarIdentifier::Chinese.fields(date);
    let mut names = Vec::new();
    let fixed = match (date.month, date.day) {
        (1, 1) => Some("元旦"),
        (3, 8) => Some("妇女节"),
        (5, 1) => Some("劳动节"),
        (5, 4) => Some("青年节"),
        (6, 1) => Some("儿童节"),
        (8, 1) => Some("建军节"),
        (9, 10) => Some("教师节"),
        (10, 1) => Some("国庆节"),
        _ => None,
    };
    if let Some(name) = fixed {
        names.push(name.into());
    }
    if !lunar.leap_month {
        let name = match (lunar.month_number, lunar.day) {
            (1, 1) => Some("春节"),
            (1, 15) => Some("元宵节"),
            (2, 2) => Some("龙抬头"),
            (5, 5) => Some("端午节"),
            (7, 7) => Some("七夕"),
            (7, 15) => Some("中元节"),
            (8, 15) => Some("中秋节"),
            (9, 9) => Some("重阳节"),
            (12, 8) => Some("腊八节"),
            _ => None,
        };
        if let Some(name) = name {
            names.push(name.into());
        }
    }
    let tomorrow = CalendarIdentifier::Chinese.fields(date.add_days(1));
    if tomorrow.year != lunar.year {
        names.push("除夕".into());
    }
    if solar_term(date) == Some("清明") {
        names.push("清明节".into());
    }
    names
}
pub fn lunar_day(date: Date) -> String {
    let f = CalendarIdentifier::Chinese.fields(date);
    if f.day == 1 {
        return CalendarIdentifier::Chinese.month_label(date, &[]);
    }
    let digit = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    match f.day {
        1..=10 => format!("初{}", digit[f.day as usize - 1]),
        11..=19 => format!("十{}", digit[f.day as usize - 11]),
        20 => "二十".into(),
        21..=29 => format!("廿{}", digit[f.day as usize - 21]),
        _ => "三十".into(),
    }
}
