//! Date-only Gregorian arithmetic and WinUI picker color/value conversions.
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct Date {
    pub year: i32,
    pub month: u8,
    pub day: u8,
}
impl Default for Date {
    fn default() -> Self {
        Self {
            year: 1970,
            month: 1,
            day: 1,
        }
    }
}
impl Date {
    pub fn new(year: i32, month: u8, day: u8) -> Result<Self, String> {
        if !(1..=9999).contains(&year)
            || !(1..=12).contains(&month)
            || day == 0
            || day > Self::month_days(year, month)
        {
            return Err("Date must be a valid Gregorian day in years 1 through 9999".into());
        }
        Ok(Self { year, month, day })
    }
    pub fn parse(value: &str) -> Result<Self, String> {
        let parts = value.split('-').collect::<Vec<_>>();
        if parts.len() != 3
            || parts[0].len() != 4
            || parts[1].len() != 2
            || parts[2].len() != 2
            || !parts
                .iter()
                .all(|part| part.bytes().all(|b| b.is_ascii_digit()))
        {
            return Err("Date must use YYYY-MM-DD".into());
        }
        Self::new(
            parts[0].parse().map_err(|_| "Invalid year")?,
            parts[1].parse().map_err(|_| "Invalid month")?,
            parts[2].parse().map_err(|_| "Invalid day")?,
        )
    }
    pub fn iso(self) -> String {
        format!("{:04}-{:02}-{:02}", self.year, self.month, self.day)
    }
    pub fn month_days(year: i32, month: u8) -> u8 {
        match month {
            2 => {
                if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) {
                    29
                } else {
                    28
                }
            }
            4 | 6 | 9 | 11 => 30,
            _ => 31,
        }
    }
    /// Days since 1970-01-01. Arithmetic remains independent of time zones/DST.
    pub fn ordinal(self) -> i32 {
        let y = self.year - i32::from(self.month <= 2);
        let era = y.div_euclid(400);
        let year = y - era * 400;
        let month = i32::from(self.month) + if self.month > 2 { -3 } else { 9 };
        let day = (153 * month + 2) / 5 + i32::from(self.day) - 1;
        era * 146097 + year * 365 + year / 4 - year / 100 + day - 719468
    }
    pub fn from_ordinal(value: i32) -> Self {
        let value = value.clamp(
            Self {
                year: 1,
                month: 1,
                day: 1,
            }
            .ordinal(),
            Self {
                year: 9999,
                month: 12,
                day: 31,
            }
            .ordinal(),
        ) + 719468;
        let era = value.div_euclid(146097);
        let day = value - era * 146097;
        let year = (day - day / 1460 + day / 36524 - day / 146096) / 365;
        let mut y = year + era * 400;
        let day = day - (365 * year + year / 4 - year / 100);
        let month = (5 * day + 2) / 153;
        let d = day - (153 * month + 2) / 5 + 1;
        let m = month + if month < 10 { 3 } else { -9 };
        y += i32::from(m <= 2);
        Self {
            year: y,
            month: m as u8,
            day: d as u8,
        }
    }
    pub fn add_days(self, days: i32) -> Self {
        Self::from_ordinal(self.ordinal().saturating_add(days))
    }
    pub fn add_months(self, months: i32) -> Self {
        let total = (self.year * 12 + i32::from(self.month) - 1)
            .saturating_add(months)
            .clamp(12, 9999 * 12 + 11);
        let year = total / 12;
        let month = (total % 12 + 1) as u8;
        Self {
            year,
            month,
            day: self.day.min(Self::month_days(year, month)),
        }
    }
    pub fn weekday(self) -> u8 {
        (self.ordinal() + 4).rem_euclid(7) as u8
    }
}

pub fn parse_time(value: &str) -> Result<u16, String> {
    let values = value.split(':').collect::<Vec<_>>();
    if values.len() != 2
        || values
            .iter()
            .any(|v| v.len() != 2 || !v.bytes().all(|b| b.is_ascii_digit()))
    {
        return Err("Time must use HH:MM".into());
    }
    let hour: u16 = values[0].parse().map_err(|_| "Invalid hour")?;
    let minute: u16 = values[1].parse().map_err(|_| "Invalid minute")?;
    if hour > 23 || minute > 59 {
        return Err("Time is outside the 24-hour clock".into());
    }
    Ok(hour * 60 + minute)
}
pub fn time_string(value: u16) -> String {
    format!("{:02}:{:02}", value / 60, value % 60)
}
pub fn coerce_minutes(value: u16, increment: u8) -> u16 {
    // TimePicker::GetAdjustedMinuteIncrement treats zero as one; coercion
    // floors the minute within its hour instead of rounding to another hour.
    let step = u16::from(increment.max(1));
    value - value % 60 % step
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Hsv {
    pub h: f64,
    pub s: f64,
    pub v: f64,
    pub a: f64,
}
impl Hsv {
    pub fn from_rgba(rgba: [f64; 4]) -> Self {
        let [r, g, b, a] = rgba;
        let max = r.max(g).max(b);
        let min = r.min(g).min(b);
        let delta = max - min;
        let hue = if delta == 0. {
            0.
        } else if max == r {
            ((g - b) / delta).rem_euclid(6.)
        } else if max == g {
            (b - r) / delta + 2.
        } else {
            (r - g) / delta + 4.
        };
        Self {
            h: hue * 60.,
            s: if max == 0. { 0. } else { delta / max },
            v: max,
            a,
        }
    }
    pub fn rgba(self) -> [f64; 4] {
        let h = self.h.rem_euclid(360.) / 60.;
        let c = self.v * self.s;
        let x = c * (1. - (h % 2. - 1.).abs());
        let m = self.v - c;
        let [r, g, b] = match h as u8 {
            0 => [c, x, 0.],
            1 => [x, c, 0.],
            2 => [0., c, x],
            3 => [0., x, c],
            4 => [x, 0., c],
            _ => [c, 0., x],
        };
        [r + m, g + m, b + m, self.a]
    }
    pub fn css(self) -> String {
        crate::material::css(self.rgba())
    }
    pub fn hex(self, alpha: bool) -> String {
        let c = self.rgba().map(|v| (v.clamp(0., 1.) * 255.).round() as u8);
        if alpha {
            format!("#{:02X}{:02X}{:02X}{:02X}", c[3], c[0], c[1], c[2])
        } else {
            format!("#{:02X}{:02X}{:02X}", c[0], c[1], c[2])
        }
    }
    pub fn from_hex(value: &str, alpha: bool) -> Option<Self> {
        let s = value.trim().trim_start_matches('#');
        if s.len() != if alpha { 8 } else { 6 } || !s.is_ascii() {
            return None;
        }
        let n = u32::from_str_radix(s, 16).ok()?;
        Some(Self::from_rgba([
            ((n >> 16) & 255) as f64 / 255.,
            ((n >> 8) & 255) as f64 / 255.,
            (n & 255) as f64 / 255.,
            if alpha { (n >> 24) as f64 / 255. } else { 1. },
        ]))
    }
}
