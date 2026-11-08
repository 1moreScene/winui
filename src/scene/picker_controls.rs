//! Source-backed calendar, date/time and color picker templates.
use super::*;
use crate::{
    picker_value::{Date, Hsv},
    render::Draw,
    resources::{Brush, Resources},
};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    sync::{Arc, OnceLock},
};
mod input;
mod layout;
mod motion;
mod paint;

pub fn is_control(kind: NodeKind) -> bool {
    matches!(
        kind,
        NodeKind::CalendarView
            | NodeKind::CalendarDatePicker
            | NodeKind::DatePicker
            | NodeKind::TimePicker
            | NodeKind::ColorPicker
    )
}
fn contract() -> &'static Value {
    static V: OnceLock<Value> = OnceLock::new();
    V.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../references/picker-controls-template.json"
        ))
        .expect("fixed SDK picker templates")
    })
}
pub(super) fn scalar(key: &str) -> f64 {
    for theme in ["Shared", "Default", "Light"] {
        if let Some(s) = contract()["metrics"][theme][key]["value"].as_str() {
            return s
                .trim()
                .parse()
                .unwrap_or_else(|_| panic!("Picker scalar {key}"));
        }
    }
    panic!("Missing picker scalar {key}")
}
pub(super) fn style_number(style: &str, key: &str) -> f64 {
    contract()["styles"][style][key]
        .as_str()
        .unwrap_or_else(|| panic!("Picker style {style}.{key}"))
        .parse()
        .unwrap()
}
pub(super) fn brush(theme: Theme, key: &str) -> Brush {
    Resources::current()
        .resolve(theme, key)
        .cloned()
        .unwrap_or_else(|_| {
            let value = &contract()["palettes"][theme.as_str()][key];
            serde_json::from_value(value.clone())
                .unwrap_or_else(|_| panic!("Missing picker brush {key} in {theme:?}"))
        })
}
pub(super) fn color(theme: Theme, key: &str) -> String {
    brush(theme, key).solid_color()
}

/// Host locale data, supplied by the SDK's Intl adapter. Dates, state, layout,
/// navigation, coercion and input remain Rust-owned.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct PickerLocale {
    pub language: String,
    pub digits: Vec<String>,
    pub months: Vec<String>,
    pub short_months: Vec<String>,
    pub weekdays: Vec<String>,
    pub abbreviated_weekdays: Vec<String>,
    pub date_order: Vec<String>,
    pub time_order: Vec<String>,
    pub month_year_order: Vec<String>,
    pub month_year_separator: String,
    pub year_suffix: String,
    pub day_suffix: String,
    pub date_separator: String,
    pub periods: Vec<String>,
    pub labels: HashMap<String, String>,
}
impl Default for PickerLocale {
    fn default() -> Self {
        Self {
            language: "en-US".into(),
            digits: (0..10).map(|n| n.to_string()).collect(),
            months: [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ]
            .map(str::to_owned)
            .to_vec(),
            short_months: [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
            ]
            .map(str::to_owned)
            .to_vec(),
            weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
                .map(str::to_owned)
                .to_vec(),
            abbreviated_weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                .map(str::to_owned)
                .to_vec(),
            date_order: ["month", "day", "year"].map(str::to_owned).to_vec(),
            time_order: ["hour", "minute", "period"].map(str::to_owned).to_vec(),
            month_year_order: ["month", "year"].map(str::to_owned).to_vec(),
            month_year_separator: " ".into(),
            year_suffix: String::new(),
            day_suffix: String::new(),
            periods: vec!["AM".into(), "PM".into()],
            date_separator: "/".into(),
            labels: [
                ("year", "Year"),
                ("month", "Month"),
                ("day", "Day"),
                ("hour", "hour"),
                ("minute", "minute"),
                ("red", "Red"),
                ("green", "Green"),
                ("blue", "Blue"),
                ("hue", "Hue"),
                ("saturation", "Saturation"),
                ("value", "Value"),
                ("alpha", "Alpha"),
                ("more", "More"),
                ("less", "Less"),
                ("accept", "Accept"),
                ("dismiss", "Dismiss"),
            ]
            .map(|(k, v)| (k.into(), v.into()))
            .into_iter()
            .collect(),
        }
    }
}
impl PickerLocale {
    pub fn number(&self, value: i32) -> String {
        value
            .to_string()
            .chars()
            .map(|c| {
                c.to_digit(10)
                    .map(|n| self.digits[n as usize].clone())
                    .unwrap_or_else(|| c.to_string())
            })
            .collect::<String>()
    }
    pub fn label(&self, key: &str) -> String {
        self.labels.get(key).cloned().unwrap_or_else(|| key.into())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct PickerProperties {
    pub date: Option<String>,
    pub time: Option<u16>,
    pub today: String,
    pub now_minutes: u16,
    pub display_date: Option<String>,
    pub min_date: Option<String>,
    pub max_date: Option<String>,
    pub selected_dates: Vec<String>,
    pub blackout_dates: Vec<String>,
    pub density_colors: HashMap<String, Vec<String>>,
    pub calendar_identifier: CalendarIdentifier,
    pub display_mode: CalendarViewDisplayMode,
    pub calendar_selection_mode: CalendarViewSelectionMode,
    pub first_day_of_week: DayOfWeek,
    pub number_of_weeks: usize,
    pub year_columns: usize,
    pub year_rows: usize,
    pub is_group_label_visible: bool,
    pub is_out_of_scope_enabled: bool,
    pub is_today_highlighted: bool,
    pub day_visible: bool,
    pub day_format: String,
    pub month_visible: bool,
    pub year_visible: bool,
    pub clock_identifier: ClockIdentifier,
    pub minute_increment: u8,
    pub color: String,
    pub previous_color: Option<String>,
    pub is_alpha_enabled: bool,
    pub is_color_spectrum_visible: bool,
    pub is_color_preview_visible: bool,
    pub is_color_slider_visible: bool,
    pub is_alpha_slider_visible: bool,
    pub is_more_button_visible: bool,
    pub is_color_channel_text_input_visible: bool,
    pub is_alpha_text_input_visible: bool,
    pub is_hex_input_visible: bool,
    pub min_hue: f64,
    pub max_hue: f64,
    pub min_saturation: f64,
    pub max_saturation: f64,
    pub min_value: f64,
    pub max_value: f64,
    pub color_spectrum_shape: ColorSpectrumShape,
    pub color_spectrum_components: ColorSpectrumComponents,
    pub color_representation: ColorRepresentation,
    pub calendar_locale: PickerLocale,
    pub format_locale: PickerLocale,
}
impl Default for PickerProperties {
    fn default() -> Self {
        Self {
            date: None,
            time: None,
            now_minutes: 0,
            today: "1970-01-01".into(),
            display_date: None,
            min_date: None,
            max_date: None,
            selected_dates: vec![],
            blackout_dates: vec![],
            density_colors: HashMap::new(),
            calendar_identifier: Default::default(),
            display_mode: Default::default(),
            calendar_selection_mode: Default::default(),
            first_day_of_week: Default::default(),
            number_of_weeks: 6,
            year_columns: 4,
            year_rows: 4,
            is_group_label_visible: false,
            is_out_of_scope_enabled: true,
            is_today_highlighted: true,
            day_visible: true,
            day_format: "day".into(),
            month_visible: true,
            year_visible: true,
            clock_identifier: Default::default(),
            minute_increment: 1,
            color: "#ffffff".into(),
            previous_color: None,
            is_alpha_enabled: false,
            is_color_spectrum_visible: true,
            is_color_preview_visible: true,
            is_color_slider_visible: true,
            is_alpha_slider_visible: true,
            is_more_button_visible: false,
            is_color_channel_text_input_visible: true,
            is_alpha_text_input_visible: true,
            is_hex_input_visible: true,
            min_hue: 0.,
            max_hue: 359.,
            min_saturation: 0.,
            max_saturation: 100.,
            min_value: 0.,
            max_value: 100.,
            color_spectrum_shape: Default::default(),
            color_spectrum_components: Default::default(),
            color_representation: Default::default(),
            calendar_locale: Default::default(),
            format_locale: Default::default(),
        }
    }
}
impl PickerProperties {
    pub fn format_day(&self, date: Date) -> String {
        let pattern = self.day_format.trim_start_matches("{}");
        let day = self.format_locale.number(date.day as i32);
        if pattern.is_empty() || pattern == "day" {
            format!("{day}{}", self.format_locale.day_suffix)
        } else {
            pattern.replace("{day.integer}", &day).replace(
                "{dayofweek.abbreviated}",
                &self.format_locale.abbreviated_weekdays[date.weekday() as usize],
            )
        }
    }
    pub fn today(&self) -> Date {
        Date::parse(&self.today).expect("validated host day")
    }
    pub fn bounds(&self) -> (Date, Date) {
        let now = self.today();
        (
            self.min_date
                .as_deref()
                .map(Date::parse)
                .transpose()
                .expect("validated min date")
                .unwrap_or(Date {
                    year: (now.year - 100).max(1),
                    month: 1,
                    day: 1,
                }),
            self.max_date
                .as_deref()
                .map(Date::parse)
                .transpose()
                .expect("validated max date")
                .unwrap_or(Date {
                    year: (now.year + 100).min(9999),
                    month: 12,
                    day: 31,
                }),
        )
    }
    pub fn day(&self) -> Date {
        self.display_date
            .as_deref()
            .or(self.date.as_deref())
            .or(self.selected_dates.first().map(String::as_str))
            .map(Date::parse)
            .transpose()
            .expect("validated date")
            .unwrap_or_else(|| self.today())
    }
    pub fn valid(&self) -> Result<(), String> {
        Date::parse(&self.today)?;
        if self.calendar_identifier != CalendarIdentifier::Gregorian {
            return Err("This picker slice requires GregorianCalendar; other calendar systems are not silently projected as Gregorian".into());
        }
        for value in self
            .date
            .iter()
            .chain(&self.display_date)
            .chain(&self.min_date)
            .chain(&self.max_date)
            .chain(&self.selected_dates)
            .chain(&self.blackout_dates)
        {
            Date::parse(value)?;
        }
        let (min, max) = self.bounds();
        if min > max {
            return Err("Picker minDate must not exceed maxDate".into());
        }
        if !(2..=8).contains(&self.number_of_weeks)
            || self.year_columns == 0
            || self.year_rows == 0
            || self.year_columns > 16
            || self.year_rows > 16
        {
            return Err("Invalid calendar dimensions".into());
        }
        if self.now_minutes >= 1440
            || self.time.is_some_and(|v| v >= 1440)
            || self.minute_increment > 59
        {
            return Err("Time or minuteIncrement is outside its range".into());
        }
        for (min, max, limit) in [
            (self.min_hue, self.max_hue, 359.),
            (self.min_saturation, self.max_saturation, 100.),
            (self.min_value, self.max_value, 100.),
        ] {
            if !min.is_finite() || !max.is_finite() || min < 0. || max > limit || min > max {
                return Err("Invalid HSV channel bounds".into());
            }
        }
        if !crate::material::valid_color(&self.color)
            || self
                .previous_color
                .as_ref()
                .is_some_and(|v| !crate::material::valid_color(v))
        {
            return Err("Invalid picker color".into());
        }
        if self.calendar_locale.digits.len() != 10
            || self.format_locale.digits.len() != 10
            || self.calendar_locale.months.len() != 12
            || self.calendar_locale.short_months.len() != 12
            || self.calendar_locale.weekdays.len() != 7
            || self.format_locale.months.len() != 12
            || self.format_locale.abbreviated_weekdays.len() != 7
            || self.format_locale.periods.len() != 2
        {
            return Err("Invalid host calendar locale descriptor".into());
        }
        let pattern = self.day_format.trim_start_matches("{}");
        let literals = pattern
            .replace("{day.integer}", "")
            .replace("{dayofweek.abbreviated}", "");
        if pattern.len() > 256 || literals.contains(['{', '}']) {
            return Err("Unsupported DayFormat token; supported tokens: {day.integer}, {dayofweek.abbreviated}".into());
        }
        for (order, expected) in [
            (
                &self.calendar_locale.date_order,
                &["year", "month", "day"][..],
            ),
            (
                &self.format_locale.date_order,
                &["year", "month", "day"][..],
            ),
            (
                &self.format_locale.time_order,
                &["hour", "minute", "period"][..],
            ),
            (
                &self.calendar_locale.month_year_order,
                &["month", "year"][..],
            ),
        ] {
            if order.len() != expected.len()
                || expected
                    .iter()
                    .any(|key| order.iter().filter(|v| v.as_str() == *key).count() != 1)
            {
                return Err("Invalid host picker field order".into());
            }
        }
        for (date, colors) in &self.density_colors {
            Date::parse(date)?;
            if colors.len() > 10 || colors.iter().any(|v| !crate::material::valid_color(v)) {
                return Err("Invalid calendar density colors".into());
            }
        }
        Ok(())
    }
}

#[derive(Default)]
pub struct PickerState {
    pub calendar_transition: Option<motion::CalendarTransition>,
    pub calendar_scroll: crate::scene::scroll::ScrollTrack,
    pub calendar_scroll_distance: f64,
    pub calendar_scroll_outgoing: Vec<Draw>,
    pub calendar_days: Vec<Draw>,
    pub calendar_presented: Vec<Draw>,
    pub header_fade_start: Option<f64>,
    pub owner: Option<u32>,
    pub role: String,
    pub parts: HashMap<String, u32>,
    pub date: Option<Date>,
    pub pending_date: Option<Date>,
    pub pending_time: u16,
    pub focus_date: Option<Date>,
    pub last_display: String,
    pub last_color: String,
    pub hsv: Option<Hsv>,
    pub more_expanded: bool,
    pub opened: bool,
    pub dirty: bool,
    pub body: Rect,
    pub face_dividers: Vec<f64>,
    pub pending_focus: Option<Date>,
    pub wheel_fields: Vec<String>,
    pub wheel_values: HashMap<String, Vec<i32>>,
    pub wheel_initial: HashMap<String, usize>,
    pub rasters: HashMap<u64, SpectrumImage>,
    pub raster_keys: HashMap<u64, String>,
    pub spectrum_touch: bool,
    pub spectrum: Rect,
    pub preview: Rect,
    pub cell: f64,
    pub calendar_grid: Rect,
    pub cells: Vec<CalendarCell>,
    pub raster: Option<SpectrumImage>,
    pub signature: String,
    pub editing_part: Option<u32>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarCell {
    pub node: u32,
    pub date: String,
    pub text: String,
    pub bounds: Rect,
    pub out_of_scope: bool,
    pub blackout: bool,
    pub selected: bool,
    pub today: bool,
}
pub struct SpectrumImage {
    pub revision: u64,
    pub width: u32,
    pub height: u32,
    pub pixels: Arc<Vec<u8>>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PickerSnapshot {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_transition: Option<CalendarPageTransitionSnapshot>,
    pub parts: HashMap<String, u32>,
    pub cells: Vec<CalendarCell>,
    pub spectrum: Rect,
    pub preview: Rect,
    pub hsv: Option<[f64; 4]>,
    pub more_expanded: bool,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarPageTransitionSnapshot {
    pub progress: f64,
    pub distance: f64,
    pub offset: f64,
}
impl PickerState {
    pub fn snapshot(&self, now: f64) -> PickerSnapshot {
        PickerSnapshot {
            page_transition: self.calendar_scroll.active(now).then(|| {
                let progress = self.calendar_scroll.value(now);
                CalendarPageTransitionSnapshot {
                    progress,
                    distance: self.calendar_scroll_distance,
                    offset: self.calendar_scroll_distance * progress,
                }
            }),
            parts: self.parts.clone(),
            cells: self.cells.clone(),
            spectrum: self.spectrum,
            preview: self.preview,
            hsv: self.hsv.map(|v| [v.h, v.s, v.v, v.a]),
            more_expanded: self.more_expanded,
        }
    }
}

pub fn defaults(kind: NodeKind, p: &mut NodeProperties) {
    if is_control(kind) {
        p.picker_controls = Some(Box::default());
        p.is_tab_stop = false;
        p.corner_radius = 4.;
        p.horizontal_alignment = HorizontalAlignment::Left;
        p.vertical_alignment = VerticalAlignment::Top;
        if kind == NodeKind::CalendarDatePicker {
            p.placeholder_text = "Select a date".into();
        }
        if kind == NodeKind::ColorPicker {
            p.orientation = Orientation::Vertical;
        }
    }
}
pub fn validate(kind: NodeKind, p: &mut NodeProperties) -> Result<(), String> {
    if is_control(kind) {
        let q = p.picker_controls.get_or_insert_with(Box::default);
        q.valid()?;
        q.color = crate::material::css(crate::material::rgba(&q.color));
        if let Some(v) = q.previous_color.as_mut() {
            *v = crate::material::css(crate::material::rgba(v));
        }
        let (min, max) = q.bounds();
        if let Some(date) = &mut q.date {
            *date = Date::parse(date)?.clamp(min, max).iso();
        }
        let mut seen = std::collections::HashSet::new();
        q.selected_dates.retain(|date| seen.insert(date.clone()));
        if q.calendar_selection_mode == CalendarViewSelectionMode::None {
            q.selected_dates.clear();
        }
        if q.calendar_selection_mode == CalendarViewSelectionMode::Single {
            q.selected_dates.truncate(1);
        }
        if let Some(time) = q.time.as_mut() {
            *time = crate::picker_value::coerce_minutes(*time, q.minute_increment);
        }
    }
    Ok(())
}

impl Scene {
    pub(super) fn is_picker_surface(&self, id: u32) -> bool {
        self.nodes[&id].picker.role == "WheelSurface"
    }
    fn picker_part(
        &mut self,
        owner: u32,
        parent: u32,
        role: &str,
        kind: NodeKind,
        props: Value,
    ) -> Result<u32, String> {
        self.picker_template_depth += 1;
        let created = self.create(parent, kind, props);
        self.picker_template_depth -= 1;
        let id = created?;
        let node = self.nodes.get_mut(&id).unwrap();
        node.picker.owner = Some(owner);
        node.picker.role = role.into();
        node.composed.owner = Some(owner);
        node.composed.role = "PickerPart";
        self.nodes
            .get_mut(&owner)
            .unwrap()
            .picker
            .parts
            .insert(role.into(), id);

        Ok(id)
    }
    pub(super) fn init_picker(&mut self, id: u32) -> Result<(), String> {
        let kind = self.nodes[&id].kind;
        if kind != NodeKind::CalendarView {
            self.picker_part(
                id,
                id,
                "Header",
                NodeKind::TextBlock,
                json!({"isTabStop":false,"visible":false}),
            )?;
        }
        if kind == NodeKind::CalendarView {
            for i in 0..7 {
                self.picker_part(id,id,&format!("WeekDay{i}"),NodeKind::TextBlock,json!({"fontSize":12,"fontWeight":600,"padding":[12,12,12,12],"horizontalAlignment":"Center","verticalAlignment":"Center"}))?;
            }
            self.picker_part(id,id,"HeaderButton",NodeKind::Button,json!({"variant":"Subtle","padding":[8,7,8,8],"fontWeight":600,"horizontalContentAlignment":"Left"}))?;
            for (role, text) in [("PreviousButton", "\u{eddb}"), ("NextButton", "\u{eddc}")] {
                self.picker_part(id,id,role,NodeKind::Button,json!({"text":text,"fontFamily":"Segoe Fluent Icons","fontSize":8,"variant":"Subtle","padding":[12,11.5,12,11.5],"minWidth":0,"minHeight":0,"accessibleName":if role=="PreviousButton"{"Previous"}else{"Next"}}))?;
            }
            for index in 0..56 {
                self.picker_part(
                    id,
                    id,
                    &format!("GroupLabel{index}"),
                    NodeKind::TextBlock,
                    json!({"fontSize":8,"isTabStop":false,"visible":false}),
                )?;
                self.picker_part(id,id,&format!("Day{index}"),NodeKind::Button,json!({"padding":[0,0,0,0],"minWidth":0,"minHeight":0,"background":"#00000000","foreground":"#00000000","borderBrush":"#00000000","isTabStop":false}))?;
            }
        } else if matches!(
            kind,
            NodeKind::CalendarDatePicker | NodeKind::DatePicker | NodeKind::TimePicker
        ) {
            self.picker_part(id,id,"InputButton",NodeKind::Button,json!({"minWidth":0,"minHeight":0,"padding":[0,0,0,0],"background":"#00000000","foreground":"#00000000","borderBrush":"#00000000"}))?;
            for i in 0..3 {
                self.picker_part(
                    id,
                    id,
                    &format!("Field{i}"),
                    NodeKind::TextBlock,
                    json!({"isTabStop":false}),
                )?;
            }
            if kind == NodeKind::CalendarDatePicker {
                self.picker_part(
                    id,
                    id,
                    "CalendarGlyph",
                    NodeKind::FontIcon,
                    json!({"glyph":"\u{e787}","fontSize":12}),
                )?;
            }
            let calendar = kind == NodeKind::CalendarDatePicker;
            let popup=self.picker_part(id,id,"Popup",NodeKind::Flyout,json!({"minWidth":0,"maxWidth":null,"cornerRadius":if calendar{8}else{4},"padding":[0,0,0,0],"isOpen":false,"autoFocus":true,"borderThickness":if calendar{[0.;4]}else{[1.;4]},"borderBrush":{"resource":if calendar{"CalendarViewBorderBrush"}else{if kind==NodeKind::TimePicker{"TimePickerFlyoutPresenterBorderBrush"}else{"DatePickerFlyoutPresenterBorderBrush"}}},"background":null,"acrylicResource":if calendar{Some("FlyoutPresenterBackground")}else{Some(if kind==NodeKind::TimePicker{"TimePickerFlyoutPresenterBackground"}else{"DatePickerFlyoutPresenterBackground"})}}))?;
            if calendar {
                self.picker_part(
                    id,
                    popup,
                    "Calendar",
                    NodeKind::CalendarView,
                    json!({"cornerRadius":8}),
                )?;
            } else {
                let surface =
                    self.picker_part(id, popup, "WheelSurface", NodeKind::Canvas, json!({}))?;
                for role in ["FirstWheel", "SecondWheel", "ThirdWheel"] {
                    self.picker_part(id,surface,role,NodeKind::ListView,json!({"minWidth":0,"minHeight":0,"selectionMode":"None","isItemClickEnabled":true,"horizontalScrollBarVisibility":"Disabled","verticalScrollBarVisibility":"Hidden","itemHeight":40,"itemContainerStyle":{"minHeight":40,"margin":[0,0,0,0],"padding":[0,3,0,6],"borderThickness":[0,0,0,0]},"fontSize":14}))?;
                }
                for wheel in ["FirstWheel", "SecondWheel", "ThirdWheel"] {
                    for (direction, glyph) in [("Up", "\u{eddb}"), ("Down", "\u{eddc}")] {
                        self.picker_part(id,surface,&format!("{wheel}{direction}Button"),NodeKind::RepeatButton,json!({"text":glyph,"fontFamily":"Segoe Fluent Icons","fontSize":8,"minWidth":0,"minHeight":0,"padding":[0,0,0,0],"isTabStop":false,"visible":false,"zIndex":2,"accessibleName":format!("{direction} {wheel}")}))?;
                    }
                }
                for (role, text) in [("AcceptButton", "\u{e8fb}"), ("DismissButton", "\u{e711}")] {
                    self.picker_part(id,surface,role,NodeKind::Button,json!({"text":text,"fontFamily":"Segoe Fluent Icons","fontSize":16,"minWidth":0,"minHeight":0,"variant":"Subtle","padding":[0,0,0,0],"accessibleName":if role=="AcceptButton"{"Accept"}else{"Dismiss"}}))?;
                }
            }
        } else if kind == NodeKind::ColorPicker {
            self.picker_part(id,id,"Spectrum",NodeKind::Button,json!({"minWidth":0,"minHeight":0,"padding":[0,0,0,0],"background":"#00000000","foreground":"#00000000","borderBrush":"#00000000","accessibleName":"Color spectrum"}))?;
            self.picker_part(id,id,"PreviousColor",NodeKind::Button,json!({"minWidth":0,"minHeight":0,"padding":[0,0,0,0],"background":"#00000000","foreground":"#00000000","borderBrush":"#00000000","accessibleName":"Previous color","visible":false}))?;
            for role in ["ThirdDimensionSlider", "AlphaSlider"] {
                self.picker_part(id,id,role,NodeKind::Slider,json!({"minimum":0,"maximum":100,"value":100,"isThumbToolTipEnabled":false,"accessibleName":if role=="AlphaSlider"{"Alpha"}else{"Value"}}))?;
            }
            self.picker_part(id,id,"Representation",NodeKind::ComboBox,json!({"width":120,"collectionItems":[{"id":"Rgb","text":"RGB"},{"id":"Hsv","text":"HSV"}],"selectedIndex":0,"accessibleName":"Color model"}))?;
            for role in [
                "Channel0",
                "Channel1",
                "Channel2",
                "AlphaTextBox",
                "HexTextBox",
            ] {
                self.picker_part(
                    id,
                    id,
                    role,
                    NodeKind::TextBox,
                    json!({"width":120,"minWidth":0,"isSpellCheckEnabled":false}),
                )?;
            }
            for role in [
                "ChannelLabel0",
                "ChannelLabel1",
                "ChannelLabel2",
                "AlphaLabel",
            ] {
                self.picker_part(
                    id,
                    id,
                    role,
                    NodeKind::TextBlock,
                    json!({"isTabStop":false}),
                )?;
            }
            self.picker_part(
                id,
                id,
                "MoreGlyph",
                NodeKind::FontIcon,
                json!({"glyph":"\u{e70d}","fontSize":12,"isTabStop":false}),
            )?;
            self.picker_part(
                id,
                id,
                "MoreButton",
                NodeKind::ToggleButton,
                json!({"minWidth":120,"minHeight":32,"padding":[0,0,0,0],"accessibleName":"More"}),
            )?;
        }
        let q = self.nodes[&id]
            .props
            .picker_controls
            .as_deref()
            .unwrap()
            .clone();
        let state = &mut self.nodes.get_mut(&id).unwrap().picker;
        state.focus_date = Some(q.day());
        state.date = if kind == NodeKind::CalendarView {
            Some(q.day())
        } else {
            q.date.as_deref().map(Date::parse).transpose()?
        };
        state.hsv = Some(Hsv::from_rgba(crate::material::rgba(&q.color)));
        state.last_color = q.color.clone();
        self.sync_picker(id);
        Ok(())
    }
    pub(super) fn sync_pickers(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|node| is_control(node.kind))
            .map(|node| node.id)
            .collect::<Vec<_>>();
        for id in ids {
            if self.nodes.contains_key(&id) {
                self.sync_picker(id);
            }
        }
    }
    fn sync_picker(&mut self, id: u32) {
        let node = &self.nodes[&id];
        let p = node.props.clone();
        let kind = node.kind;
        let q = p.picker_controls.as_deref().unwrap().clone();
        let focused = self.focused;
        let wheel_hover = self.pointer.and_then(|(x, y)| {
            self.nodes[&id]
                .picker
                .parts
                .iter()
                .find(|(role, part)| role.ends_with("Wheel") && self.inside(**part, x, y))
                .map(|(role, _)| role.clone())
        });
        if node
            .picker
            .editing_part
            .is_some_and(|part| focused != Some(part))
        {
            self.nodes.get_mut(&id).unwrap().picker.editing_part = None;
        }
        if self.nodes[&id].picker.last_color != q.color {
            let state = &mut self.nodes.get_mut(&id).unwrap().picker;
            state.hsv = Some(Hsv::from_rgba(crate::material::rgba(&q.color)));
            state.last_color = q.color.clone();
            state.editing_part = None;
        }
        if self.nodes[&id].picker.last_display != q.display_date.clone().unwrap_or_default() {
            let state = &mut self.nodes.get_mut(&id).unwrap().picker;
            state.focus_date = Some(q.day());
            if kind == NodeKind::CalendarView {
                state.date = Some(q.day());
            }
            state.last_display = q.display_date.clone().unwrap_or_default();
        }
        let opening = p.is_open && !self.nodes[&id].picker.opened;
        if opening {
            let state = &mut self.nodes.get_mut(&id).unwrap().picker;
            state.pending_date = Some(
                q.date
                    .as_deref()
                    .and_then(|v| Date::parse(v).ok())
                    .unwrap_or_else(|| q.today()),
            );
            state.pending_time = crate::picker_value::coerce_minutes(
                q.time.unwrap_or(q.now_minutes),
                q.minute_increment,
            );
            state.opened = true;
        }
        if !p.is_open {
            self.nodes.get_mut(&id).unwrap().picker.opened = false;
        }
        let state = &self.nodes[&id].picker;
        let signature = format!(
            "{}|{}|{}|{}|{:?}|{:?}|{:?}|{:?}|{}|{:?}|{}",
            serde_json::to_string(&q).unwrap(),
            p.header,
            p.placeholder_text,
            p.font_size,
            p.font_family,
            (focused, wheel_hover),
            state.pending_date,
            (state.pending_time, state.hsv),
            p.is_open,
            state.focus_date,
            state.more_expanded
        );
        if signature == state.signature {
            return;
        }
        self.nodes.get_mut(&id).unwrap().picker.signature = signature;
        if kind == NodeKind::CalendarView {
            let date = self.nodes[&id].picker.date.unwrap_or_else(|| q.day());
            let header = match q.display_mode {
                CalendarViewDisplayMode::Month => self.picker_month_header(&q, date),
                CalendarViewDisplayMode::Year => {
                    format!("{}{}", date.year, q.calendar_locale.year_suffix)
                }
                CalendarViewDisplayMode::Decade => {
                    format!("{} - {}", date.year / 10 * 10, date.year / 10 * 10 + 9)
                }
            };
            self.patch_part(id,"HeaderButton",json!({"text":header,"enabled":q.display_mode!=CalendarViewDisplayMode::Decade,"fontFamily":p.font_family,"fontSize":p.font_size}));
            let (min, max) = q.bounds();
            self.patch_part(
                id,
                "PreviousButton",
                json!({"enabled":date.year>min.year||date.month>min.month}),
            );
            self.patch_part(
                id,
                "NextButton",
                json!({"enabled":date.year<max.year||date.month<max.month}),
            );
        } else if matches!(
            kind,
            NodeKind::CalendarDatePicker | NodeKind::DatePicker | NodeKind::TimePicker
        ) {
            let prefix = kind.as_str();
            let theme = self.nodes[&id].theme;
            let disabled = if self.nodes[&id].enabled {
                ""
            } else {
                "Disabled"
            };
            self.patch_part(
                id,
                "Header",
                json!({"foreground":color(theme,&format!("{prefix}HeaderForeground{disabled}"))}),
            );
            if kind == NodeKind::CalendarDatePicker {
                self.patch_part(id,"CalendarGlyph",json!({"foreground":color(theme,&format!("CalendarDatePickerCalendarGlyphForeground{disabled}"))}));
            }
            self.patch_part(id,"InputButton",json!({"accessibleName":p.accessible_name.clone().unwrap_or_else(||if !p.header.is_empty(){p.header.clone()}else{kind.as_str().into()})}));
            self.patch_part(id,"Popup",json!({"isOpen":p.is_open,"placementTarget":self.nodes[&id].picker.parts["InputButton"],"width":if kind==NodeKind::CalendarDatePicker{None}else{Some(self.nodes[&id].rect.width.max(if kind==NodeKind::DatePicker{scalar("DatePickerThemeMinWidth")}else{scalar("TimePickerThemeMinWidth")}))}}));
            if kind == NodeKind::CalendarDatePicker {
                let mut nested = q.clone();
                nested.calendar_selection_mode = CalendarViewSelectionMode::Single;
                nested.selected_dates = q.date.clone().into_iter().collect();
                nested.display_date = q.date.clone().or_else(|| Some(q.today.clone()));
                self.patch_part(id, "Calendar", json!({"pickerControls":nested}));
            } else if p.is_open {
                self.sync_picker_wheels(id, opening);
            }
        } else if kind == NodeKind::ColorPicker {
            let hsv = self.nodes[&id].picker.hsv.unwrap();
            let fields = p.orientation == Orientation::Horizontal
                || !q.is_more_button_visible
                || self.nodes[&id].picker.more_expanded;
            self.patch_part(
                id,
                "Spectrum",
                json!({"visible":q.is_color_spectrum_visible}),
            );
            self.patch_part(
                id,
                "PreviousColor",
                json!({"visible":q.is_color_preview_visible&&q.previous_color.is_some()}),
            );
            let (channel, min, max, value) = Self::third_dimension(&q, hsv);
            self.patch_part(id,"ThirdDimensionSlider",json!({"visible":q.is_color_slider_visible,"orientation":if p.orientation==Orientation::Horizontal{"Vertical"}else{"Horizontal"},"minimum":min,"maximum":max,"value":value,"accessibleName":q.format_locale.label(channel)}));
            self.patch_part(id,"AlphaSlider",json!({"visible":q.is_alpha_enabled&&q.is_alpha_slider_visible,"orientation":if p.orientation==Orientation::Horizontal{"Vertical"}else{"Horizontal"},"value":hsv.a*100.,"accessibleName":q.format_locale.label("alpha")}));
            self.patch_part(id,"Representation",json!({"visible":fields&&q.is_color_channel_text_input_visible,"selectedIndex":usize::from(q.color_representation==ColorRepresentation::Hsv)}));
            let rgba = hsv.rgba();
            for i in 0..3 {
                let key = format!("Channel{i}");
                let value = if q.color_representation == ColorRepresentation::Rgb {
                    (rgba[i] * 255.).round()
                } else {
                    [hsv.h, hsv.s * 100., hsv.v * 100.][i].round()
                };
                let label = if q.color_representation == ColorRepresentation::Rgb {
                    ["red", "green", "blue"][i]
                } else {
                    ["hue", "saturation", "value"][i]
                };
                let editing = self.nodes[&id].picker.editing_part
                    == self.nodes[&id].picker.parts.get(&key).copied();
                self.patch_part(id,&key,json!({"visible":fields&&q.is_color_channel_text_input_visible,"fontFamily":p.font_family,"fontSize":p.font_size,"accessibleName":q.format_locale.label(label)}));
                if !editing {
                    self.patch_part(id, &key, json!({"text":format!("{value:.0}")}));
                }
            }
            for (key, text, visible) in [
                (
                    "HexTextBox",
                    hsv.hex(q.is_alpha_enabled),
                    fields && q.is_hex_input_visible,
                ),
                (
                    "AlphaTextBox",
                    format!("{:.0}%", hsv.a * 100.),
                    fields && q.is_alpha_enabled && q.is_alpha_text_input_visible,
                ),
            ] {
                self.patch_part(id,key,json!({"visible":visible,"fontFamily":p.font_family,"fontSize":p.font_size,"accessibleName":if key=="HexTextBox"{"Hex"}else{"Alpha"}}));
                if self.nodes[&id].picker.editing_part
                    != self.nodes[&id].picker.parts.get(key).copied()
                {
                    self.patch_part(id, key, json!({"text":text}));
                }
            }
            self.patch_part(id,"MoreGlyph",json!({"visible":q.is_more_button_visible&&p.orientation!=Orientation::Horizontal,"glyph":if fields{"\u{e70e}"}else{"\u{e70d}"}}));
            self.patch_part(id,"MoreButton",json!({"visible":q.is_more_button_visible&&p.orientation!=Orientation::Horizontal,"isChecked":self.nodes[&id].picker.more_expanded,"text":q.format_locale.label(if fields{"less"}else{"more"})}));
        }
    }
    fn picker_month_header(&self, q: &PickerProperties, date: Date) -> String {
        let month = &q.calendar_locale.months[date.month as usize - 1];
        let year = format!("{}{}", date.year, q.calendar_locale.year_suffix);
        if q.calendar_locale
            .month_year_order
            .first()
            .is_some_and(|v| v == "year")
        {
            format!("{year}{}{month}", q.calendar_locale.month_year_separator)
        } else {
            format!("{month}{}{year}", q.calendar_locale.month_year_separator)
        }
    }
    fn third_dimension(q: &PickerProperties, hsv: Hsv) -> (&'static str, f64, f64, f64) {
        match q.color_spectrum_components {
            ColorSpectrumComponents::HueSaturation | ColorSpectrumComponents::SaturationHue => {
                ("value", q.min_value, q.max_value, hsv.v * 100.)
            }
            ColorSpectrumComponents::HueValue | ColorSpectrumComponents::ValueHue => (
                "saturation",
                q.min_saturation,
                q.max_saturation,
                hsv.s * 100.,
            ),
            _ => ("hue", q.min_hue, q.max_hue, hsv.h),
        }
    }
}
