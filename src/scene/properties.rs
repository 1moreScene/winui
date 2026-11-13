use crate::{content::GridTrack, enums::*, material, model::Properties};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(untagged)]
#[derive(PartialEq)]
pub enum BrushValue {
    Color(String),
    Resource { resource: String },
    Gradient(Box<crate::resources::Brush>),
}
impl BrushValue {
    pub fn validate(&self) -> Result<(), String> {
        match self {
            Self::Gradient(brush) => {
                if !matches!(brush.kind.as_str(), "linearGradient" | "radialGradient")
                    || !matches!(
                        brush.mapping_mode.as_str(),
                        "" | "RelativeToBoundingBox" | "Absolute"
                    )
                    || !matches!(
                        brush.spread_method.as_str(),
                        "" | "Pad" | "Reflect" | "Repeat"
                    )
                    || brush.stops.len() < 2
                    || brush.stops.len() > 32
                    || !brush.opacity.is_finite()
                    || !(0. ..=1.).contains(&brush.opacity)
                    || brush
                        .from
                        .iter()
                        .chain(&brush.to)
                        .chain(&brush.center)
                        .chain(&brush.origin)
                        .chain(&brush.radius)
                        .any(|v| !v.is_finite() || v.abs() > 1e7)
                    || brush.radius.iter().any(|v| *v < 0.)
                {
                    return Err("invalid gradient geometry, kind, mapping, spread or stops".into());
                }
                let mut offset = -1.;
                for stop in &brush.stops {
                    if !stop.offset.is_finite()
                        || !(0. ..=1.).contains(&stop.offset)
                        || stop.offset < offset
                        || !material::valid_color(&stop.color)
                    {
                        return Err("invalid or unsorted gradient stops".into());
                    }
                    offset = stop.offset;
                }
                Ok(())
            }
            Self::Color(c) if !material::valid_color(c) => {
                Err("brush color must be #RRGGBB or #RRGGBBAA".into())
            }
            Self::Resource { resource } if resource.is_empty() => {
                Err("resource key cannot be empty".into())
            }
            _ => Ok(()),
        }
    }
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(untagged)]
#[derive(PartialEq)]
pub enum RadioOption {
    Text(String),
    Item {
        text: String,
        #[serde(default = "enabled_default")]
        enabled: bool,
    },
}
fn enabled_default() -> bool {
    true
}
impl RadioOption {
    pub fn text(&self) -> &str {
        match self {
            Self::Text(t) | Self::Item { text: t, .. } => t,
        }
    }
    pub fn enabled(&self) -> bool {
        match self {
            Self::Text(_) => true,
            Self::Item { enabled, .. } => *enabled,
        }
    }
}
// Keep the public property schema and the sparse browser projection in sync.
macro_rules! node_properties {
    ($($(#[$($attr:tt)*])* pub $field:ident : $ty:ty,)+) => {
        #[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
        #[serde(default, rename_all = "camelCase", deny_unknown_fields)]
        pub struct NodeProperties {
            $($(#[$($attr)*])* pub $field: $ty,)+
        }

        #[cfg(target_arch = "wasm32")]
        impl NodeProperties {
            pub(crate) fn serialize_projection<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                use serde::ser::SerializeMap;
                static DEFAULTS: std::sync::LazyLock<NodeProperties> = std::sync::LazyLock::new(NodeProperties::default);
                let mut map = serializer.serialize_map(None)?;
                $(node_properties!(@field map self DEFAULTS $field $(#[$($attr)*])*);)+
                map.end()
            }
        }
    };
    (@field $map:ident $value:ident $defaults:ident $field:ident #[serde(skip)]) => {};
    (@field $map:ident $value:ident $defaults:ident $field:ident #[serde(rename=$name:literal,skip_serializing_if=$skip:literal)]) => {
        if $value.$field != $defaults.$field { $map.serialize_entry($name, &$value.$field)?; }
    };
    (@field $map:ident $value:ident $defaults:ident command_controls #[serde(skip_serializing_if=$skip:literal)]) => {
        if !$value.command_controls.is_default() {
            $map.serialize_entry("commandControls", &$value.command_controls)?;
        }
    };
    (@field $map:ident $value:ident $defaults:ident nav_controls #[serde(skip_serializing_if=$skip:literal)]) => {
        if !$value.nav_controls.is_default() {
            $map.serialize_entry("navControls", &$value.nav_controls)?;
        }
    };
    (@field $map:ident $value:ident $defaults:ident $field:ident $(#[$($attr:tt)*])*) => {
        if $value.$field != $defaults.$field {
            static KEY: std::sync::LazyLock<String> = std::sync::LazyLock::new(|| projection_key(stringify!($field)));
            $map.serialize_entry(KEY.as_str(), &$value.$field)?;
        }
    };
}

#[cfg(target_arch = "wasm32")]
fn projection_key(field: &str) -> String {
    let mut parts = field.split('_');
    let mut key = parts.next().unwrap().to_owned();
    for part in parts {
        let mut chars = part.chars();
        key.extend(chars.next().unwrap().to_uppercase());
        key.push_str(chars.as_str());
    }
    key
}

node_properties! {
    pub segmented_style: SegmentedStyle,
    #[serde(skip_serializing_if="Option::is_none")]
    pub segmented_source: Option<std::sync::Arc<Vec<super::segmented::SourceItem>>>,
    pub single_selection_follows_focus: bool,
    #[serde(skip_serializing_if="String::is_empty")]
    pub name:String,
    #[serde(skip_serializing_if="std::collections::BTreeMap::is_empty")]
    pub element_references:std::collections::BTreeMap<super::ElementReferenceProperty,Option<String>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub table:Option<Box<super::table_view::TableProperties>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub motion:Option<Box<super::motion_effects::MotionProperties>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub primitives:Option<Box<super::scroll_primitives::PrimitiveProperties>>,
    pub tick_frequency:f64,
    #[serde(skip_serializing_if="Option::is_none")]
    pub menu_item:Option<Box<super::menu_item_controls::MenuItemProperties>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub content_host:Option<Box<super::content_hosts::HostProperties>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub reading:Option<Box<super::reading_controls::ReadingProperties>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub repeater:Option<Box<super::repeater::RepeaterProperties>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub refresh:Option<Box<super::refresh::RefreshProperties>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub view_controls: Option<Box<super::view_controls::ViewProperties>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub menu_controls: Option<Box<super::command_menus::MenuProperties>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub panel_controls: Option<Box<super::layout_panels::PanelProperties>>,
    pub layout_key: String,
    #[serde(skip_serializing_if="Option::is_none")]
    pub relative: Option<Box<super::layout_panels::RelativeConstraints>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub picker_controls: Option<Box<super::picker_controls::PickerProperties>>,
    #[serde(skip_serializing_if="super::command_controls::CommandProperties::is_default")]
    pub command_controls: super::command_controls::CommandProperties,
    #[serde(skip_serializing_if="super::navigation_controls::NavigationProperties::is_default")]
    pub nav_controls: super::navigation_controls::NavigationProperties,
    pub number_value: Option<f64>,
    pub number_decimal_separator: String,
    pub number_group_separator: String,
    pub number_minus_sign: String,
    pub number_digits: std::sync::Arc<[String; 10]>,
    pub number_group_sizes: [u8; 2],
    pub number_use_grouping: bool,
    pub number_min_fraction_digits: u8,
    pub number_locale: String,
    pub number_rounding_increment: Option<f64>,
    pub placement_margin: [f64; 4],
    pub number_box_editor: bool,
    pub editor_helper_right_inset: f64,
    pub spin_button_placement_mode: NumberBoxSpinButtonPlacementMode,
    pub validation_mode: NumberBoxValidationMode,
    pub is_wrap_enabled: bool,
    pub accepts_expression: bool,
    pub is_editable: bool,
    pub clearable: bool,
    pub is_tree_combo: bool,
    pub editor_clear_selection: bool,
    pub is_text_search_enabled: bool,
    pub is_drop_down_open: bool,
    pub is_suggestion_list_open: bool,
    pub update_text_on_select: bool,
    pub max_drop_down_height: f64,
    pub query_icon: bool,
    pub primary_button_text: String,
    pub secondary_button_text: String,
    pub close_button_text: String,
    pub action_button_content: String,
    pub is_primary_button_enabled: bool,
    pub is_secondary_button_enabled: bool,
    pub default_button: ContentDialogButton,
    pub subtitle: String,
    pub preferred_placement: TeachingTipPlacementMode,
    pub tail_visibility: TeachingTipTailVisibility,
    pub hero_content_placement: TeachingTipHeroContentPlacementMode,
    pub shadow_depth: Option<f64>,
    pub collection_items: std::sync::Arc<Vec<super::collections::CollectionData>>,
    pub items_panel_vertical_alignment: VerticalAlignment,
    pub items_updating_scroll_mode: ItemsUpdatingScrollMode,
    pub collection_groups: std::sync::Arc<Vec<super::collections::CollectionGroup>>,
    pub are_sticky_group_headers_enabled: bool,
    pub has_group_header_template: bool,
    pub group_header_height: Option<f64>,
    pub hides_empty_groups: bool,
    pub can_drag_items: bool,
    pub can_reorder_items: bool,
    pub allow_drop: bool,
    pub has_more_items: bool,
    pub is_loading: bool,
    pub incremental_loading_threshold: f64,
    pub selected_keys: std::sync::Arc<Vec<String>>,
    pub selection_mode: ListViewSelectionMode,
    pub is_item_click_enabled: bool,
    pub items_panel: Option<NodeKind>,
    pub item_width: Option<f64>,
    pub item_height: Option<f64>,
    pub maximum_rows_or_columns: i32,
    pub cache_length: f64,
    pub has_item_template: bool,
    pub item_container_style: super::collections::ItemContainerStyle,
    pub collection_owner: Option<u32>,
    pub collection_key: String,
    pub collection_index: usize,
    pub title: String,
    pub message: String,
    pub severity: InfoBarSeverity,
    pub is_closable: bool,
    pub is_icon_visible: bool,
    pub is_info_bar_action: bool,
    pub is_expander_header: bool,
    pub display_name: String,
    pub initials: String,
    pub profile_picture: String,
    pub is_group: bool,
    pub badge_number: i32,
    pub badge_glyph: String,
    pub badge_image_source: String,
    pub badge_text: String,
    pub caption: String,
    pub max_rating: i32,
    pub initial_set_value: i32,
    pub is_clear_enabled: bool,
    pub placeholder_value: f64,
    pub rating_item_info: Option<super::compact_controls::RatingItemInfo>,
    pub flyout_target: Option<u32>,
    pub context_flyout_target: Option<u32>,
    pub close_flyout: bool,
    pub is_open: bool,
    pub placement: OverlayPlacement,
    pub placement_position: Option<[f64; 2]>,
    pub placement_target: Option<u32>,
    pub is_light_dismiss_enabled: bool,
    pub auto_focus: bool,
    pub restore_focus: bool,
    pub menu_items: Vec<super::overlays::MenuEntry>,
    pub step_frequency: f64,
    pub small_change: f64,
    pub large_change: f64,
    pub is_direction_reversed: bool,
    pub is_thumb_tool_tip_enabled: bool,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub min_width: f64,
    pub min_height: f64,
    pub max_width: Option<f64>,
    pub max_height: Option<f64>,
    pub margin: [f64; 4],
    pub padding: [f64; 4],
    pub horizontal_alignment: HorizontalAlignment,
    pub vertical_alignment: VerticalAlignment,
    pub row: usize,
    pub column: usize,
    pub row_span: usize,
    pub column_span: usize,
    pub rows: Vec<GridTrack>,
    pub columns: Vec<GridTrack>,
    pub orientation: Orientation,
    pub spacing: f64,
    pub row_spacing: Option<f64>,
    pub column_spacing: Option<f64>,
    pub visible: bool,
    pub is_hit_test_visible: bool,
    pub enabled: bool,
    pub opacity: f64,
    pub translation_x: f64,
    pub translation_y: f64,
    pub translation_z: f64,
    pub theme_shadow: bool,
    pub scale_x: f64,
    pub scale_y: f64,
    pub rotation: f64,
    pub center_point: [f64; 2],
    pub acrylic: Option<material::AcrylicOptions>,
    pub acrylic_resource: Option<String>,
    pub transform: [f64; 6],
    pub clip: bool,
    pub theme: Option<Theme>,
    pub background: Option<BrushValue>,
    pub foreground: Option<BrushValue>,
    pub corner_radius: f64,
    pub corner_radii: Option<[f64; 4]>,
    pub border_brush: Option<BrushValue>,
    pub border_thickness: [f64; 4],
    pub canvas_left: Option<f64>,
    pub canvas_top: Option<f64>,
    pub z_index: i32,
    pub navigate_uri: Option<String>,
    pub is_expanded: bool,
    pub expand_direction: ExpandDirection,
    pub horizontal_content_alignment: HorizontalAlignment,
    pub vertical_content_alignment: VerticalAlignment,
    pub badge_style: InfoBadgeStyle,
    pub glyph: String,
    pub symbol: Option<Symbol>,
    #[serde(skip)]
    pub badge_auto_padding: bool,
    #[serde(skip)]
    pub badge_auto_radius: bool,
    pub text: String,
    pub document: Option<Box<super::rich_edit::RichEditDocument>>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub rtf:Option<String>,
    #[serde(rename="mathML",skip_serializing_if="Option::is_none")]
    pub math_ml:Option<String>,
    pub max_lines: usize,
    pub placeholder_text: String,
    pub description: String,
    pub is_read_only: bool,
    pub accepts_return: bool,
    pub max_length: usize,
    pub selection_start: usize,
    pub selection_length: usize,
    pub selection_highlight_color: Option<String>,
    pub character_spacing: f64,
    pub is_spell_check_enabled: bool,
    pub password: String,
    pub password_char: String,
    pub password_reveal_mode: PasswordRevealMode,
    pub horizontal_scroll_mode: ScrollMode,
    pub vertical_scroll_mode: ScrollMode,
    pub horizontal_scroll_bar_visibility: ScrollBarVisibility,
    pub vertical_scroll_bar_visibility: ScrollBarVisibility,
    pub zoom_mode: ZoomMode,
    pub zoom_factor: f64,
    pub min_zoom_factor: f64,
    pub max_zoom_factor: f64,
    pub horizontal_offset: f64,
    pub vertical_offset: f64,
    pub is_horizontal_scroll_chaining_enabled: bool,
    pub is_vertical_scroll_chaining_enabled: bool,
    pub is_tab_stop: bool,
    pub font_family: String,
    pub font_size: f64,
    pub font_weight: u16,
    pub font_style: FontStyle,
    pub is_checked: Option<bool>,
    pub is_selected: bool,
    pub is_three_state: bool,
    pub group_name: String,
    pub header: String,
    pub items: Vec<RadioOption>,
    pub selected_index: i32,
    pub max_columns: usize,
    pub value: f64,
    pub minimum: f64,
    pub maximum: f64,
    pub is_active: bool,
    pub is_indeterminate: bool,
    pub show_error: bool,
    pub show_paused: bool,
    pub is_on: bool,
    pub on_content: String,
    pub off_content: String,
    pub wrap: bool,
    pub trimming: TextTrimming,
    pub optical_margin_alignment: OpticalMarginAlignment,
    pub line_height: Option<f64>,
    pub variant: ButtonVariant,
    pub click_mode: ClickMode,
    pub accessible_name: Option<String>,
    pub source: String,
    pub icon_source: Option<crate::icon_source::IconSource>,
    pub fallback_icon_source: Option<crate::icon_source::IconSource>,
    pub flow_direction: FlowDirection,
    #[serde(skip)]
    pub flow_direction_local: bool,
    pub mirrored_when_right_to_left: bool,
    pub animated_icon_state: String,
    pub use_parent_state: bool,
    pub state: String,
    pub pointer_notifications: bool,
    pub uri_source: String,
    pub data: String,
    pub fill: Option<BrushValue>,
    pub stroke: Option<BrushValue>,
    pub stroke_thickness: f64,
    pub radius_x: f64,
    pub radius_y: f64,
    pub x1: f64,
    pub y1: f64,
    pub x2: f64,
    pub y2: f64,
    pub points: Vec<[f64; 2]>,
    pub fill_rule: FillRule,
    pub stroke_start_line_cap: PenLineCap,
    pub stroke_end_line_cap: PenLineCap,
    pub stroke_dash_cap: PenLineCap,
    pub stroke_line_join: PenLineJoin,
    pub stroke_miter_limit: f64,
    pub stroke_dash_offset: f64,
    pub stroke_dash_array: Vec<f64>,
    pub show_as_monochrome: bool,
    pub stretch: ImageStretch,
    pub stretch_direction: StretchDirection,
    pub delay: u32,
    pub interval: u32,
    pub navigation: Option<Box<Properties>>,
}
impl Default for NodeProperties {
    fn default() -> Self {
        Self {
            name:String::new(),
            element_references:Default::default(),
            motion:None,
            repeater:None,refresh:None,
            menu_item:None,
            table:None,
            primitives:None,
            tick_frequency:0.,
            content_host:None,
            reading:None,view_controls:None,
            menu_controls:None,panel_controls:None,layout_key:String::new(),relative:None,
            command_controls:Default::default(),
            picker_controls:None,
            nav_controls: Default::default(),
            number_value: None,
            number_decimal_separator: String::new(),
            number_group_separator: String::new(),
            number_minus_sign: String::new(),
            number_digits: {
                static DIGITS: std::sync::LazyLock<std::sync::Arc<[String; 10]>> =
                    std::sync::LazyLock::new(|| std::sync::Arc::new(std::array::from_fn(|i| i.to_string())));
                DIGITS.clone()
            },
            number_group_sizes: [3, 3],
            number_use_grouping: false,
            number_min_fraction_digits: 0,
            number_locale: String::new(),
            number_rounding_increment: None,
            placement_margin: [0.; 4],
            number_box_editor: false,
            editor_helper_right_inset: 0.,
            spin_button_placement_mode: Default::default(),
            validation_mode: Default::default(),
            is_wrap_enabled: false,
            accepts_expression: false,
            is_editable: false,
            clearable: false,
            is_tree_combo: false,
            editor_clear_selection: false,
            is_text_search_enabled: true,
            is_drop_down_open: false,
            is_suggestion_list_open: false,
            update_text_on_select: true,
            max_drop_down_height: 504.,
            query_icon: false,
            primary_button_text: String::new(),
            secondary_button_text: String::new(),
            close_button_text: String::new(),
            action_button_content: String::new(),
            is_primary_button_enabled: true,
            is_secondary_button_enabled: true,
            default_button: Default::default(),
            subtitle: String::new(),
            preferred_placement: Default::default(),
            tail_visibility: Default::default(),
            hero_content_placement: Default::default(),
            shadow_depth: None,
            collection_items: Default::default(),
            items_panel_vertical_alignment: VerticalAlignment::Top,
            items_updating_scroll_mode: Default::default(),
            collection_groups: Default::default(),
            are_sticky_group_headers_enabled: true,
            has_group_header_template: false,
            group_header_height: None,
            hides_empty_groups: false,
            can_drag_items: false,
            can_reorder_items: false,
            allow_drop: false,
            has_more_items: false,
            is_loading: false,
            incremental_loading_threshold: 3.,
            selected_keys: Default::default(),
            selection_mode: ListViewSelectionMode::Single,
            is_item_click_enabled: false,
            items_panel: None,
            item_width: None,
            item_height: None,
            maximum_rows_or_columns: -1,
            cache_length: 4.,
            has_item_template: false,
            item_container_style: Default::default(),
            collection_owner: None,
            collection_key: String::new(),
            collection_index: 0,
            title: String::new(),
            message: String::new(),
            severity: InfoBarSeverity::Informational,
            is_closable: true,
            is_icon_visible: true,
            is_info_bar_action: false,
            is_expander_header: false,
            display_name: String::new(),
            initials: String::new(),
            profile_picture: String::new(),
            is_group: false,
            badge_number: 0,
            badge_glyph: String::new(),
            badge_image_source: String::new(),
            badge_text: String::new(),
            caption: String::new(),
            max_rating: 5,
            initial_set_value: 1,
            is_clear_enabled: true,
            placeholder_value: -1.,
            rating_item_info: None,
            flyout_target: None,
            context_flyout_target: None,
            close_flyout: false,
            is_open: false,
            placement: OverlayPlacement::Auto,
            placement_position: None,
            placement_target: None,
            is_light_dismiss_enabled: false,
            auto_focus: false,
            restore_focus: true,
            menu_items: vec![],
            step_frequency: 1.,
            small_change: 1.,
            large_change: 10.,
            is_direction_reversed: false,
            is_thumb_tool_tip_enabled: true,
            width: None,
            height: None,
            min_width: 0.,
            min_height: 0.,
            max_width: None,
            max_height: None,
            margin: [0.; 4],
            padding: [0.; 4],
            horizontal_alignment: HorizontalAlignment::Stretch,
            vertical_alignment: VerticalAlignment::Stretch,
            row: 0,
            column: 0,
            row_span: 1,
            column_span: 1,
            rows: vec![],
            columns: vec![],
            orientation: Orientation::Vertical,
            spacing: 0.,
            row_spacing: None,
            column_spacing: None,
            visible: true,
            is_hit_test_visible: true,
            enabled: true,
            opacity: 1.,
            translation_x: 0.,
            translation_y: 0.,
            translation_z: 0.,
            theme_shadow: false,
            scale_x: 1.,
            scale_y: 1.,
            rotation: 0.,
            center_point: [0.; 2],
            acrylic: None,
            acrylic_resource: None,
            transform: [1., 0., 0., 1., 0., 0.],
            clip: false,
            theme: None,
            background: None,
            foreground: None,
            corner_radius: 0.,
            corner_radii: None,
            border_brush: None,
            border_thickness: [0.; 4],
            canvas_left: None,
            canvas_top: None,
            z_index: 0,
            navigate_uri: None,
            is_expanded: false,
            expand_direction: ExpandDirection::Down,
            horizontal_content_alignment: HorizontalAlignment::Center,
            vertical_content_alignment: VerticalAlignment::Center,
            badge_style: InfoBadgeStyle::Default,
            glyph: String::new(),
            symbol: None,
            badge_auto_padding: false,
            badge_auto_radius: false,
            text: String::new(),
            document: None,rtf:None,math_ml:None,
            max_lines: 0,
            placeholder_text: String::new(),
            description: String::new(),
            is_read_only: false,
            accepts_return: false,
            max_length: 0,
            selection_start: 0,
            selection_length: 0,
            selection_highlight_color: None,
            character_spacing: 0.,
            is_spell_check_enabled: false,
            password: String::new(),
            password_char: "●".into(),
            password_reveal_mode: PasswordRevealMode::Peek,
            horizontal_scroll_mode: ScrollMode::Auto,
            vertical_scroll_mode: ScrollMode::Auto,
            horizontal_scroll_bar_visibility: ScrollBarVisibility::Disabled,
            vertical_scroll_bar_visibility: ScrollBarVisibility::Visible,
            zoom_mode: ZoomMode::Disabled,
            zoom_factor: 1.,
            min_zoom_factor: 0.1,
            max_zoom_factor: 10.,
            horizontal_offset: 0.,
            vertical_offset: 0.,
            is_horizontal_scroll_chaining_enabled: true,
            is_vertical_scroll_chaining_enabled: true,
            is_tab_stop: true,
            font_family: "Segoe UI, system-ui, sans-serif".into(),
            font_size: 14.,
            font_weight: 400,
            font_style: FontStyle::Normal,
            is_checked: Some(false),
            is_selected: false,
            is_three_state: false,
            group_name: String::new(),
            header: String::new(),
            items: vec![],
            segmented_style: SegmentedStyle::Default,
            segmented_source: None,
            single_selection_follows_focus: false,
            selected_index: -1,
            max_columns: 1,
            value: 0.,
            minimum: 0.,
            maximum: 100.,
            is_active: true,
            is_indeterminate: false,
            show_error: false,
            show_paused: false,
            is_on: false,
            on_content: "On".into(),
            off_content: "Off".into(),
            wrap: false,
            trimming: TextTrimming::None,
            optical_margin_alignment: OpticalMarginAlignment::None,
            line_height: None,
            variant: ButtonVariant::Standard,
            click_mode: ClickMode::Release,
            accessible_name: None,
            source: String::new(),
            icon_source: None,
            fallback_icon_source: None,
            flow_direction: FlowDirection::LeftToRight,
            flow_direction_local: false,
            mirrored_when_right_to_left: false,
            animated_icon_state: String::new(),
            use_parent_state: false,
            state: String::new(),
            pointer_notifications: false,
            uri_source: String::new(),
            data: String::new(),
            fill: None,
            stroke: None,
            stroke_thickness: 1.,
            radius_x: 0.,
            radius_y: 0.,
            x1: 0.,
            y1: 0.,
            x2: 0.,
            y2: 0.,
            points: vec![],
            fill_rule: FillRule::EvenOdd,
            stroke_start_line_cap: PenLineCap::Flat,
            stroke_end_line_cap: PenLineCap::Flat,
            stroke_dash_cap: PenLineCap::Flat,
            stroke_line_join: PenLineJoin::Miter,
            stroke_miter_limit: 10.,
            stroke_dash_offset: 0.,
            stroke_dash_array: vec![],
            show_as_monochrome: true,
            stretch: ImageStretch::Uniform,
            stretch_direction: StretchDirection::Both,
            delay: 500,
            interval: 33,
            navigation: None,
        }
    }
}
impl NodeProperties {
    pub fn defaults(kind: NodeKind) -> Self {
        let mut p = Self::default();
        if kind == NodeKind::Grid { p.is_tab_stop = false; }
        match kind {
            NodeKind::SplitView|NodeKind::SemanticZoom|NodeKind::ParallaxView|NodeKind::SwipeControl=>{p.clip=true;p.is_tab_stop=false;}
            NodeKind::UICommand|NodeKind::StandardCommand=>{p.width=Some(0.);p.height=Some(0.);p.is_tab_stop=false;}
            NodeKind::Popup | NodeKind::ToolTip | NodeKind::Flyout | NodeKind::MenuFlyout => {
                p.is_tab_stop = kind == NodeKind::MenuFlyout;
                p.horizontal_alignment = HorizontalAlignment::Left;
                p.vertical_alignment = VerticalAlignment::Top;
                p.clip = true;
                p.wrap = true;
                p.is_light_dismiss_enabled =
                    matches!(kind, NodeKind::Flyout | NodeKind::MenuFlyout);
                p.auto_focus = matches!(kind, NodeKind::Flyout | NodeKind::MenuFlyout);
                if kind != NodeKind::Popup {
                    p.border_thickness = [1.; 4];
                    p.corner_radius = if kind == NodeKind::ToolTip { 4. } else { 8. };
                    p.padding = super::overlays::padding(match kind {
                        NodeKind::ToolTip => "ToolTipBorderPadding",
                        NodeKind::Flyout => "FlyoutContentPadding",
                        _ => "MenuFlyoutPresenterThemePadding",
                    });
                    if kind == NodeKind::ToolTip {
                        p.font_size = 12.;
                        p.max_width = Some(super::overlays::metric("ToolTipMaxWidth", 320.));
                    } else {
                        p.min_width = 96.;
                        if kind == NodeKind::Flyout {
                            p.max_width = Some(456.);
                        }
                    }
                }
            }
            NodeKind::Slider => {
                p.orientation = Orientation::Horizontal;
                p.minimum = 0.;
                p.maximum = 100.;
                p.is_tab_stop = true;
                p.min_height = 32.;
            }
            NodeKind::Rectangle
            | NodeKind::Line
            | NodeKind::Path
            | NodeKind::Polygon
            | NodeKind::Polyline => {
                p.is_tab_stop = false;
                p.stretch = if kind == NodeKind::Rectangle {
                    ImageStretch::Fill
                } else {
                    ImageStretch::None
                };
            }
            NodeKind::Button
            | NodeKind::RepeatButton
            | NodeKind::ToggleButton
            | NodeKind::CheckBox
            | NodeKind::RadioButton
            | NodeKind::ToggleSwitch => {
                let d = crate::button::defaults();
                p.padding = d.padding;
                p.horizontal_alignment = HorizontalAlignment::Left;
                p.vertical_alignment = VerticalAlignment::Center;
                p.corner_radius = d.corner_radius;
                p.font_size = d.font_size;
                p.font_family = format!("{}, system-ui, sans-serif", d.font_family);
                if kind == NodeKind::RepeatButton {
                    let defaults = &super::basic_next::contract()["nativeDefaults"];
                    p.delay = defaults["delay"].as_u64().unwrap() as u32;
                    p.interval = defaults["interval"].as_u64().unwrap() as u32;
                    p.click_mode = ClickMode::Press;
                }
                if kind == NodeKind::CheckBox {
                    let c = crate::selection::checkbox();
                    p.padding = c.padding;
                    p.min_width = c.min_width;
                    p.min_height = c.height;
                    p.wrap = true;
                }
                if kind == NodeKind::RadioButton {
                    p.padding = [8., 6., 0., 0.];
                    p.min_width = 120.;
                    p.min_height = 32.;
                    p.wrap = true;
                }
                if kind == NodeKind::ToggleSwitch {
                    p.padding = [0.; 4];
                    p.min_width = 154.;
                    p.min_height = 40.;
                }
            }
            NodeKind::HyperlinkButton => {
                let d = crate::button::defaults();
                p.padding = d.padding;
                p.corner_radius = d.corner_radius;
                p.horizontal_alignment = HorizontalAlignment::Left;
                p.vertical_alignment = VerticalAlignment::Center;
            }
            NodeKind::Border | NodeKind::Canvas => {
                p.is_tab_stop = false;
            }
            NodeKind::AnimatedIcon
            | NodeKind::IconSourceElement
            | NodeKind::FontIcon
            | NodeKind::SymbolIcon
            | NodeKind::PathIcon
            | NodeKind::BitmapIcon
            | NodeKind::ImageIcon => {
                p.is_tab_stop = false;
                p.font_size = 20.;
                p.font_family = "Segoe Fluent Icons, Segoe MDL2 Assets".into();
                if kind == NodeKind::SymbolIcon {
                    p.symbol = Some(Symbol::Emoji);
                }
            }
            NodeKind::InfoBadge => {
                p.is_tab_stop = false;
                p.value = -1.;
                p.badge_auto_radius = true;
                p.badge_auto_padding = true;
                p.font_size = super::five_controls::scalar("InfoBadgeValueFontSize");
                p.min_width = super::five_controls::scalar("InfoBadgeMinWidth");
                p.min_height = super::five_controls::scalar("InfoBadgeMinHeight");
                p.max_height = Some(super::five_controls::scalar("InfoBadgeMaxHeight"));
            }
            NodeKind::Expander => {
                p.min_width = super::five_controls::native_scalar("expanderMinWidth");
                p.min_height = super::five_controls::scalar("ExpanderMinHeight");
                p.padding = [super::five_controls::scalar("ExpanderContentPadding"); 4];
                p.corner_radius = 4.;
                p.horizontal_alignment = HorizontalAlignment::Left;
                p.vertical_alignment = VerticalAlignment::Center;
            }
            NodeKind::ProgressBar | NodeKind::ProgressRing => {
                p.is_tab_stop = false;
                p.vertical_alignment = VerticalAlignment::Center;
                if kind == NodeKind::ProgressRing {
                    p.width = Some(32.);
                    p.height = Some(32.);
                    p.min_width = 16.;
                    p.min_height = 16.;
                    p.horizontal_alignment = HorizontalAlignment::Center;
                    p.is_indeterminate = true;
                } else {
                    p.min_height = super::progress::scalar("ProgressBarMinHeight");
                    p.corner_radius = super::progress::scalar("ProgressBarCornerRadius");
                }
            }
            NodeKind::NavigationView => {
                p.navigation = Some(Box::default());
                p.clip = true;
            }
            NodeKind::NavigationViewItem => {
                p.is_tab_stop=true;p.min_height=40.;p.min_width=40.;
            }
            NodeKind::TextBox | NodeKind::PasswordBox | NodeKind::RichEditBox => {
                let m = if kind==NodeKind::RichEditBox {super::rich_edit::native_defaults()}else{super::text_edit::native_defaults()};
                if kind == NodeKind::RichEditBox {
                    p.accepts_return = true;
                    p.wrap = super::rich_edit::contract()["defaults"]["TextWrapping"] == "Wrap";
                    p.is_spell_check_enabled = true;
                    p.horizontal_scroll_bar_visibility = ScrollBarVisibility::Auto;
                    p.vertical_scroll_bar_visibility = ScrollBarVisibility::Auto;
                }
                p.padding = m.padding;
                p.min_width = m.min_width;
                p.min_height = m.min_height;
                p.corner_radius = m.radius;
                p.horizontal_alignment = HorizontalAlignment::Stretch;
                p.vertical_alignment = VerticalAlignment::Top;
            }
            NodeKind::Viewbox => {
                p.is_tab_stop = false;
            }
            NodeKind::ScrollViewer | NodeKind::ScrollView => {
                if kind==NodeKind::ScrollView {p.vertical_scroll_mode=ScrollMode::Enabled;p.horizontal_scroll_mode=ScrollMode::Disabled;p.min_zoom_factor=0.1;p.max_zoom_factor=10.;}
                p.clip = true;
                p.is_tab_stop = false;
            }
            _ => {}
        }
        super::compact_controls::defaults(kind, &mut p);
        super::repeater::defaults(kind,&mut p);super::refresh::defaults(kind,&mut p);
        super::collections::defaults(kind, &mut p);
        super::composed::defaults(kind, &mut p);
        super::navigation_controls::defaults(kind, &mut p);
        super::segmented::defaults(kind, &mut p);
        super::command_controls::defaults(kind,&mut p);
        super::command_menus::defaults(kind,&mut p);
        super::layout_panels::defaults(kind,&mut p);
        if kind==NodeKind::TableView{p.table=Some(Box::default());p.is_tab_stop=true;p.clip=true;p.border_thickness=[1.;4];p.corner_radius=4.;p.border_brush=Some(BrushValue::Resource{resource:"TableViewBorderBrush".into()});}
        super::scroll_primitives::defaults(kind,&mut p);
        super::content_hosts::defaults(kind,&mut p);
        super::reading_controls::defaults(kind,&mut p);
        super::menu_item_controls::defaults(kind,&mut p);
        super::picker_controls::defaults(kind,&mut p);
        p
    }
    pub fn font(&self) -> crate::typography::Font {
        crate::typography::Font {
            family: self.font_family.clone(),
            size: self.font_size,
            weight: self.font_weight,
            style: self.font_style,
        }
    }
    pub fn display_text(&self, kind: NodeKind) -> &str {
        if kind == NodeKind::ToggleSwitch {
            if self.is_on {
                &self.on_content
            } else {
                &self.off_content
            }
        } else {
            &self.text
        }
    }
    pub fn validate(&self, kind: NodeKind) -> Result<(), String> {
        if let Some(motion)=&self.motion {motion.validate()?;}
        super::menu_item_controls::validate(kind,self)?;
        super::view_controls::validate(self)?;
        if kind==NodeKind::TableView&&self.table.is_none(){return Err("TableView requires its table properties".into());}
        super::table_view::validate(self)?;
        super::segmented::validate_source(kind,self)?;
        super::scroll_primitives::validate(self)?;
        super::content_hosts::validate(self)?;
        super::reading_controls::validate(self)?;
        super::reading_controls::validate_for(kind,self)?;
        if self
            .placement_position
            .is_some_and(|p| p.iter().any(|v| !v.is_finite() || v.abs() > 1e9))
        {
            return Err("invalid popup placement position".into());
        }
        super::repeater::validate(kind,self)?;
        super::collections::validate(kind, self)?;
        if self.corner_radii.is_some_and(|r| {
            kind != NodeKind::Border || r.iter().any(|v| !v.is_finite() || *v < 0. || *v > 10000.)
        }) {
            return Err("cornerRadii requires Border and four finite nonnegative radii".into());
        }
        if crate::shapes::is_shape(kind) {
            if self.points.len() > 4096
                || self
                    .points
                    .iter()
                    .flatten()
                    .chain([
                        &self.x1,
                        &self.x2,
                        &self.y1,
                        &self.y2,
                        &self.stroke_dash_offset,
                    ])
                    .any(|n| !n.is_finite() || n.abs() > 1e7)
                || [
                    self.radius_x,
                    self.radius_y,
                    self.stroke_thickness,
                    self.stroke_miter_limit,
                ]
                .iter()
                .any(|n| !n.is_finite() || *n < 0. || *n > 10000.)
                || self.stroke_dash_array.len() > 1024
                || self
                    .stroke_dash_array
                    .iter()
                    .any(|n| !n.is_finite() || *n < 0. || *n > 10000.)
                || (!self.stroke_dash_array.is_empty()
                    && self.stroke_dash_array.iter().all(|n| *n == 0.))
            {
                return Err("Invalid shape geometry or stroke style".into());
            }
            for brush in [&self.fill, &self.stroke].into_iter().flatten() {
                brush.validate()?;
                if let BrushValue::Resource { resource } = brush {
                    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
                        crate::resources::Resources::current().resolve(theme, resource)?;
                    }
                }
            }
            crate::shapes::geometry(kind, self)?;
        }

        if let Some(source) = &self.icon_source {
            if kind == NodeKind::IconSourceElement && source.kind == IconSourceKind::Image {
                return Err("The pinned native IconSourceElement does not support ImageIconSource; use ImageIcon directly".into());
            }
            source.validate(self)?;
        }
        if let Some(source) = &self.fallback_icon_source {
            source.validate(self)?;
        }
        if self.animated_icon_state.len() > 4096 || self.state.len() > 4096 {
            return Err("AnimatedIcon state exceeds size limit".into());
        }
        if kind == NodeKind::AnimatedIcon {
            serde_json::from_value::<AnimatedIconSource>(self.source.clone().into())
                .map_err(|_| "Unknown AnimatedIcon source")?;
        }

        if self.interval == 0 || self.interval > i32::MAX as u32 || self.delay > i32::MAX as u32 {
            return Err(
                "RepeatButton Delay must be nonnegative and Interval positive 32-bit milliseconds"
                    .into(),
            );
        }
        if kind == NodeKind::Viewbox && self.padding != [0.; 4] {
            return Err("Viewbox has no Padding; place a padded panel inside its child".into());
        }

        if [self.value, self.minimum, self.maximum]
            .iter()
            .any(|v| !v.is_finite() || (kind != NodeKind::NumberBox && v.abs() > 1e100))
            || self.minimum > self.maximum
        {
            return Err("range must be finite and minimum <= maximum".into());
        }
        if kind == NodeKind::ProgressRing
            && matches!(self.background, Some(BrushValue::Gradient(_)))
        {
            return Err("ProgressRing background must be a solid color; custom AnimatedVisual sources are not implemented".into());
        }
        if [
            self.zoom_factor,
            self.min_zoom_factor,
            self.max_zoom_factor,
            self.horizontal_offset,
            self.vertical_offset,
            self.character_spacing,
        ]
        .iter()
        .any(|v| !v.is_finite())
            || self.min_zoom_factor <= 0.
            || self.max_zoom_factor > 10.
            || self.min_zoom_factor > self.max_zoom_factor
            || !(self.min_zoom_factor..=self.max_zoom_factor).contains(&self.zoom_factor)
            || (!super::overlays::is_overlay(kind)
                && (self.horizontal_offset < 0. || self.vertical_offset < 0.))
            || self.max_length > 1_000_000
            || self.character_spacing.abs() > 10_000.
            || self.password.len() > 1_000_000
            || self.placeholder_text.len() > 1_000_000
            || self.description.len() > 1_000_000
            || self.password_char.encode_utf16().count() != 1
            || self
                .selection_highlight_color
                .as_ref()
                .is_some_and(|c| !material::valid_color(c))
        {
            return Err("invalid text/scroll properties".into());
        }
        if self.items.len() > 4096
            || self.items.iter().any(|i| i.text().len() > 1_000_000)
            || self.max_columns == 0
            || self.max_columns > 4096
            || self.selected_index < -1
            || (kind == NodeKind::RadioButtons && self.selected_index >= self.items.len() as i32)
        {
            return Err("invalid radio items, selectedIndex or maxColumns".into());
        }
        for n in [
            self.min_width,
            self.min_height,
            self.font_size,
            self.spacing,
            self.corner_radius,
        ]
        .into_iter()
        .chain(self.width)
        .chain(self.row_spacing)
        .chain(self.column_spacing)
        .chain(self.height)
        .chain(self.max_width)
        .chain(self.max_height)
        .chain(self.line_height)
        .chain(self.padding)
        .chain(self.border_thickness)
        {
            if !n.is_finite() || !(0. ..=1e7).contains(&n) {
                return Err("dimensions must be finite, nonnegative and <= 10000000".into());
            }
        }
        if self.font_size < 1.
            || self.font_weight < 1
            || self.font_weight > 1000
            || self.line_height == Some(0.)
        {
            return Err("invalid font size, weight or line height".into());
        }
        if !self.opacity.is_finite()
            || !(0. ..=1.).contains(&self.opacity)
            || self
                .margin
                .into_iter()
                .chain(self.transform)
                .chain(self.canvas_left)
                .chain(self.canvas_top)
                .chain(self.center_point)
                .chain([self.rotation])
                .chain([
                    self.translation_x,
                    self.translation_y,
                    self.translation_z,
                    self.scale_x,
                    self.scale_y,
                ])
                .any(|x| !x.is_finite() || x.abs() > 1e7)
        {
            return Err("invalid opacity, margin or transform".into());
        }
        if self.max_width.is_some_and(|x| x < self.min_width)
            || self.max_height.is_some_and(|x| x < self.min_height)
        {
            return Err("max size must be >= min size".into());
        }
        if self.row_span == 0
            || self.column_span == 0
            || self.row.checked_add(self.row_span).is_none_or(|v| v > 4096)
            || self
                .column
                .checked_add(self.column_span)
                .is_none_or(|v| v > 4096)
            || self.rows.len() > 4096
            || self.columns.len() > 4096
        {
            return Err("invalid grid index/span".into());
        }
        for t in self.rows.iter().chain(&self.columns) {
            if !t.value.is_finite() || t.value < 0. || t.value > 1e7 {
                return Err("invalid grid track".into());
            }
        }
        for (gradient_allowed,b) in [(kind==NodeKind::Border,&self.background),(false,&self.foreground),(kind==NodeKind::Border||super::collections::is_view(kind),&self.border_brush)] {
            let Some(b)=b else{continue;};
            b.validate()?;
            if let BrushValue::Resource { resource } = b {
                for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
                    let brush = crate::resources::Resources::current().resolve(theme, resource)?;
                    if brush.kind != "solid" && !(gradient_allowed&&matches!(brush.kind.as_str(),"linearGradient"|"radialGradient")) {
                        return Err("node color properties require a solid brush resource".into());
                    }
                }
            }
        }
        if matches!(self.foreground, Some(BrushValue::Gradient(_)))
            || (matches!(
                kind,
                NodeKind::Ellipse
                    | NodeKind::Button
                    | NodeKind::RepeatButton
                    | NodeKind::ToggleButton
                    | NodeKind::CheckBox
                    | NodeKind::TextBox
                        | NodeKind::RichEditBox
                    | NodeKind::PasswordBox
            ) && matches!(self.background, Some(BrushValue::Gradient(_))))
        {
            return Err("custom gradients currently apply to panel backgrounds".into());
        }
        if let Some(resource) = &self.acrylic_resource {
            if self.acrylic.is_some() {
                return Err("acrylic and acrylicResource are mutually exclusive".into());
            }
            for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
                let brush =
                    crate::resources::Resources::current().resolve_material(theme, resource)?;
                if !matches!(brush.kind.as_str(), "acrylic" | "solid") {
                    return Err("resource is not an Acrylic or fallback brush".into());
                }
            }
        }
        if let Some(acrylic) = &self.acrylic {
            acrylic.validate()?;
        }
        if let Some(nav) = &self.navigation {
            nav.validate()?;
        }
        if kind == NodeKind::NavigationView && self.navigation.is_none() {
            return Err("NavigationView requires navigation options".into());
        }
        if super::text_edit::is_editor(kind) && !self.description.is_empty() {
            return Err("TextBox/PasswordBox Description presenter is not implemented".into());
        }
        if let Some(doc)=&self.document {doc.validate()?;}
        if self.text.len() > 1_000_000
            || self.source.len() > 1_000_000
            || self.font_family.len() > 2048
        {
            return Err("node text/resource exceeds limits".into());
        }
        Ok(())
    }
}
/// Creation starts from the same kind defaults as an update, but only needs
/// their differences from serde's schema defaults. Avoid round-tripping every
/// default field for each source-template Grid, presenter and icon.
pub(super) fn create(
    value: &mut serde_json::Value,
    kind: NodeKind,
    table_items: Option<std::sync::Arc<Vec<super::table_view::Row>>>,
) -> Result<NodeProperties, String> {
    use std::sync::{Arc,Mutex,OnceLock};
    struct Initial{base:NodeProperties,compact:serde_json::Value}
    static INITIAL:OnceLock<Mutex<std::collections::BTreeMap<&'static str,Arc<Initial>>>>=OnceLock::new();
    static DEFAULT:OnceLock<serde_json::Value>=OnceLock::new();
    let initial={
        let mut cache=INITIAL.get_or_init(Default::default).lock().unwrap();
        cache.entry(kind.as_str()).or_insert_with(||{
            let base=NodeProperties::defaults(kind);
            let defaults=DEFAULT.get_or_init(||serde_json::to_value(NodeProperties::default()).unwrap());
            let mut compact=serde_json::to_value(&base).unwrap();
            compact.as_object_mut().unwrap().retain(|key,value|defaults.get(key)!=Some(value));
            Arc::new(Initial{base,compact})
        }).clone()
    };
    // Decode row data into its final representation before merging properties.
    // The browser passes typed rows directly, avoiding an intermediate JSON tree.
    let table_items = match table_items {
        Some(rows) => Some(rows),
        None => value.get_mut("table")
            .and_then(serde_json::Value::as_object_mut)
            .and_then(|table| table.remove("items"))
            .map(serde_json::from_value).transpose().map_err(|error| error.to_string())?,
    };
    apply_patch(&initial.base,value,kind,initial.compact.clone(),table_items)
}
pub fn patch(
    base: &NodeProperties,
    value: &serde_json::Value,
    kind: NodeKind,
) -> Result<NodeProperties, String> {
    let mut serializable = base.clone();
    serializable.selected_keys = Default::default();
    serializable.collection_items = Default::default();
    if let Some(table)=serializable.table.as_mut(){table.items=Default::default();}
    serializable.nav_controls.items = Default::default();
    serializable.command_controls.primary_commands = Default::default();
    serializable.command_controls.secondary_commands = Default::default();
    let full = serde_json::to_value(serializable).map_err(|e| e.to_string())?;
    apply_patch(base,value,kind,full,None)
}
fn apply_patch(base:&NodeProperties,value:&serde_json::Value,kind:NodeKind,mut full:serde_json::Value,table_items:Option<std::sync::Arc<Vec<super::table_view::Row>>>)->Result<NodeProperties,String>{
    let patch = value.as_object().ok_or("node patch must be an object")?;
    let has_table_items = table_items.is_some() || patch.get("table").and_then(|p|p.get("items")).is_some();
    for (key, value) in patch {
        if matches!(key.as_str(),"table"|"primitives"|"menuItem"|"contentHost"|"menuControls"|"panelControls")&&value.is_object(){
            let dest=full.as_object_mut().unwrap().entry(key).or_insert_with(||serde_json::json!({}));
            if dest.is_null(){*dest=serde_json::json!({});}for(key,value)in value.as_object().unwrap(){dest.as_object_mut().unwrap().insert(key.clone(),value.clone());}
        }else if (key == "viewControls" || key=="reading") && value.is_object() {
            let view=full.as_object_mut().unwrap().entry(key).or_insert(serde_json::Value::Null);
            if view.is_null(){*view=if key=="reading"{serde_json::to_value(super::reading_controls::ReadingProperties::default()).unwrap()}else{serde_json::to_value(super::view_controls::ViewProperties::default()).unwrap()};}
            for(key,value)in value.as_object().unwrap(){view.as_object_mut().unwrap().insert(key.clone(),value.clone());}
        }else if (key=="repeater"||key=="refresh")&&value.is_object(){
            let base=if key=="repeater"{serde_json::to_value(super::repeater::RepeaterProperties::default()).unwrap()}else{serde_json::to_value(super::refresh::RefreshProperties::default()).unwrap()};
            let entry=full.as_object_mut().unwrap().entry(key).or_insert_with(||base.clone());if entry.is_null(){*entry=base;}for(k,v)in value.as_object().unwrap(){entry.as_object_mut().unwrap().insert(k.clone(),v.clone());}
        }else if key == "pickerControls" && value.is_object() {
            let picker=full.as_object_mut().unwrap().entry(key).or_insert_with(||serde_json::to_value(super::picker_controls::PickerProperties::default()).unwrap());
            if picker.is_null(){*picker=serde_json::to_value(super::picker_controls::PickerProperties::default()).unwrap();}
            for (key,value) in value.as_object().unwrap(){picker.as_object_mut().unwrap().insert(key.clone(),value.clone());}
        }else if key == "commandControls" && value.is_object() {
            let commands = full.as_object_mut().unwrap().entry(key).or_insert_with(|| {
                serde_json::to_value(super::command_controls::CommandProperties::default()).unwrap()
            });
            for (key, value) in value.as_object().unwrap() {
                commands.as_object_mut().unwrap().insert(key.clone(), value.clone());
            }
        } else if key=="navControls" && value.is_object() {
            let nav=full.as_object_mut().unwrap().entry(key).or_insert_with(||serde_json::to_value(super::navigation_controls::NavigationProperties::default()).unwrap());
            for (key,value) in value.as_object().unwrap(){nav.as_object_mut().unwrap().insert(key.clone(),value.clone());}
        } else if key == "navigation" && value.is_object() {
            let nav = full.as_object_mut().unwrap().entry(key).or_insert(serde_json::Value::Null);
            if nav.is_null() {
                *nav = serde_json::to_value(Properties::default()).unwrap();
            }
            for (k, v) in value.as_object().unwrap() {
                nav.as_object_mut().unwrap().insert(k.clone(), v.clone());
            }
        } else {
            full.as_object_mut()
                .unwrap()
                .insert(key.clone(), value.clone());
        }
    }
    let mut result: NodeProperties = serde_json::from_value(full).map_err(|e| e.to_string())?;
    if let Some(items) = table_items {
        result.table.get_or_insert_with(Box::default).items = items;
    }
    if kind == NodeKind::RichEditBox {
        let sources=["document","text","rtf","mathML"].iter().filter(|k|patch.contains_key(**k)).count();
        if sources>1{return Err("set one RichEditBox content source: text, document, rtf or mathML".into());}
        if let Some(rtf)=result.rtf.take(){result.document=Some(Box::new(super::rich_edit::rtf::decode(&rtf)?));}
        if let Some(mathml)=result.math_ml.take(){super::rich_edit::math::parse(&mathml)?;result.document=Some(Box::new(super::rich_edit::RichEditDocument{runs:vec![super::rich_edit::RichEditRun{text:super::rich_edit::objects::OBJECT.into(),mathml:Some(mathml),..Default::default()}],..Default::default()}));}
        if patch.contains_key("text") || result.document.is_none() {
            result.text=result.text.replace("\r\n","\n").replace('\r',"\n");
            result.document=Some(Box::new(super::rich_edit::RichEditDocument::plain(result.text.clone())));
        } else {result.text=result.document.as_ref().unwrap().text();}
    } else if result.document.is_some()||result.rtf.is_some()||result.math_ml.is_some() {return Err("rich content requires RichEditBox".into());}
    // inside_bar is derived by the CommandBar, never supplied by the caller.
    result.command_controls.inside_bar = base.command_controls.inside_bar;
    if !has_table_items {if let (Some(base),Some(result))=(&base.table,&mut result.table){result.items=base.items.clone();}}
    let command_patch = patch.get("commandControls");
    if command_patch.and_then(|p| p.get("primaryCommands")).is_none() {
        result.command_controls.primary_commands = base.command_controls.primary_commands.clone();
    }
    if command_patch.and_then(|p| p.get("secondaryCommands")).is_none() {
        result.command_controls.secondary_commands = base.command_controls.secondary_commands.clone();
    }
    if patch.get("navControls").and_then(|p|p.get("items")).is_none(){result.nav_controls.items=base.nav_controls.items.clone();}
    if !patch.contains_key("selectedKeys") {
        result.selected_keys = base.selected_keys.clone();
    }
    if !patch.contains_key("collectionItems") {
        result.collection_items = base.collection_items.clone();
    }
    if kind == NodeKind::RadioButtons
        && patch.contains_key("items")
        && !patch.contains_key("selectedIndex")
        && result.selected_index >= result.items.len() as i32
    {
        result.selected_index = -1;
    }
    let len = if kind == NodeKind::PasswordBox {
        result.password.encode_utf16().count()
    } else {
        result.text.encode_utf16().count()
    };
    result.selection_start = super::text_edit::boundary(
        super::text_edit::EditorState::logical(kind, &result),
        result.selection_start.min(len),
    );
    let end=super::text_edit::boundary(super::text_edit::EditorState::logical(kind,&result),result.selection_start.saturating_add(result.selection_length).min(len));
    result.selection_length=end-result.selection_start;
    if super::progress::is_progress(kind) || matches!(kind,NodeKind::Slider|NodeKind::ScrollBar) {
        if result.minimum > result.maximum {
            if patch.contains_key("minimum") && !patch.contains_key("maximum") {
                result.maximum = result.minimum;
            } else if patch.contains_key("maximum") && !patch.contains_key("minimum") {
                result.minimum = result.maximum;
            }
        }
        if result.minimum <= result.maximum {
            result.value = result.value.clamp(result.minimum, result.maximum);
        }
    }
    if kind == NodeKind::InfoBadge
        && (result.value < -1. || result.value > i32::MAX as f64 || result.value.fract() != 0.)
    {
        return Err("InfoBadge value must be an integer >= -1".into());
    }
    if matches!(
        kind,
        NodeKind::InfoBadge | NodeKind::Expander
    ) && matches!(result.background, Some(BrushValue::Gradient(_)))
    {
        return Err("This template currently requires a solid background".into());
    }
    if result.navigate_uri.as_ref().is_some_and(|u| {
        !(u.starts_with("https://") || u.starts_with("http://") || u.starts_with("mailto:"))
    }) {
        return Err("navigateUri requires an absolute http, https or mailto URI".into());
    }
    result.badge_auto_radius = base.badge_auto_radius && !patch.contains_key("cornerRadius");
    if patch.get("symbol").is_some_and(|v| !v.is_null()) && !patch.contains_key("glyph") {
        result.glyph.clear();
    }
    if patch
        .get("glyph")
        .and_then(|v| v.as_str())
        .is_some_and(|v| !v.is_empty())
        && !patch.contains_key("symbol")
    {
        result.symbol = None;
    }
    if result.symbol.is_some() && !result.glyph.is_empty() {
        return Err("Use either symbol or glyph for one icon source".into());
    }
    result.badge_auto_padding = base.badge_auto_padding && !patch.contains_key("padding");
    if kind == NodeKind::InfoBadge && result.badge_auto_padding {
        let mode = if result.value >= 0. {
            "Value"
        } else if result.symbol.is_some() || !result.glyph.is_empty() {
            "Icon"
        } else {
            "Dot"
        };
        let key = format!("{}{mode}InfoBadgeStyle", result.badge_style.as_str());
        result.padding = super::five_controls::contract()["badgeStyles"][key]["padding"]
            .as_array()
            .map(|p| std::array::from_fn(|i| p[i].as_f64().unwrap()))
            .unwrap_or([0.; 4]);
    }
    if kind == NodeKind::Canvas
        && (result.padding != [0.; 4]
            || !result.rows.is_empty()
            || !result.columns.is_empty()
            || result.spacing != 0.)
    {
        return Err("Canvas has no Padding, track definitions or Spacing".into());
    }
    if kind!=NodeKind::Border&&!super::collections::is_view(kind)&&matches!(result.border_brush, Some(BrushValue::Gradient(_))) {
        return Err("borderBrush currently requires a solid brush".into());
    }
    if kind == NodeKind::SymbolIcon && result.symbol.is_none() {
        result.symbol = Some(Symbol::Emoji);
    }
    if kind == NodeKind::PathIcon {
        crate::icons::parse_path(&result.data)?;
    }
    if result.data.len() > 262144 || result.uri_source.len() > 1_000_000 {
        return Err("Icon source/data exceeds size limits".into());
    }
    if [
        result.step_frequency,
        result.small_change,
        result.large_change,
    ]
    .iter()
    .any(|v| !v.is_finite() || (kind != NodeKind::NumberBox && (*v < 0. || (*v == 0. && kind != NodeKind::ScrollBar) || *v > 1e100)))
    {
        return Err("Slider step/change must be finite and positive".into());
    }
    super::menu_entries::validate_entries(&result.menu_items,0)?;
    if result.menu_items.len() > 4096 {
        return Err("menu item limit exceeded".into());
    }
    let mut ids = std::collections::HashSet::new();
    for item in &result.menu_items {
        if item.text.len() > 1000000
            || item.id.len() > 1000000
            || (item.kind != MenuEntryKind::Separator
                && (item.id.is_empty() || !ids.insert(&item.id)))
        {
            return Err("menu commands need unique nonempty ids and bounded text".into());
        }
    }
    super::compact_controls::coerce(kind, &mut result, patch)?;
    super::collections::coerce(kind, &mut result, patch);
    result.flow_direction_local = base.flow_direction_local || patch.contains_key("flowDirection");
    super::navigation_controls::validate(kind, &mut result, patch)?;
    super::composed::validate_properties(kind, &mut result, patch)?;
    super::command_controls::validate(kind,&mut result)?;
    super::command_menus::validate(kind,&result)?;
    super::layout_panels::validate(&result)?;
    super::picker_controls::validate(kind,&mut result)?;
    if kind==NodeKind::NavigationView&&patch.get("navigation").and_then(|p|p.get("theme")).is_some(){result.theme=result.navigation.as_ref().map(|p|p.theme);}
    result.validate(kind)?;
    Ok(result)
}

#[cfg(test)]mod creation_tests{
    use super::*;
    #[test]fn compact_creation_preserves_every_control_default_and_validation(){
        let contract:serde_json::Value=serde_json::from_str(include_str!("../../references/control-origins.json")).unwrap();
        for entry in contract["nodeKinds"].as_array().unwrap(){
            let kind:NodeKind=serde_json::from_value(entry["name"].clone()).unwrap();
            for value in [serde_json::json!({}),serde_json::json!({"text":"Sample","width":180,"height":48}),serde_json::json!({"unknownProperty":true})]{
                let expected=patch(&NodeProperties::defaults(kind),&value,kind);
                let actual=create(&mut value.clone(),kind,None);
                match(expected,actual){
                    (Ok(expected),Ok(actual))=>assert_eq!(serde_json::to_value(actual).unwrap(),serde_json::to_value(expected).unwrap(),"{}: {value}",kind.as_str()),
                    (Err(expected),Err(actual))=>assert_eq!(actual,expected,"{}: {value}",kind.as_str()),
                    _=>panic!("{}: compact creation changed validation for {value}",kind.as_str()),
                }
            }
        }
    }
}
