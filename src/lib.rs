mod accept;
pub mod animation;
pub mod button;
pub mod calendar;
pub mod content;
pub mod enums;
pub mod frame;
#[cfg(target_arch = "wasm32")]
mod gpu;
pub mod icons;
pub mod layout;
pub mod material;
pub mod material_blur;
pub mod model;
pub mod navigation;
mod navigation_motion;
mod navigation_scroll;
pub mod number_box;
pub mod picker_value;
pub mod picker_spectrum;
pub mod render;
pub mod resources;
pub mod scene;
pub mod selection;
pub mod typography;
#[cfg(target_arch = "wasm32")]
mod wasm;

use navigation::NavigationView;
use std::collections::BTreeMap;

/// Handles are monotonically allocated and never reused, including after destroy.
#[derive(Default)]
pub struct Runtime {
    next: u32,
    controls: BTreeMap<u32, NavigationView>,
}
impl Runtime {
    pub fn allocate(&mut self) -> Result<u32, String> {
        let id = self.next.checked_add(1).ok_or("handle space exhausted")?;
        self.next = id;
        Ok(id)
    }
    pub fn create(&mut self, props: model::Properties) -> Result<u32, String> {
        let control = NavigationView::new(props)?;
        let id = self.allocate()?;
        self.controls.insert(id, control);
        Ok(id)
    }
    pub fn get(&mut self, id: u32) -> Result<&mut NavigationView, String> {
        self.controls
            .get_mut(&id)
            .ok_or_else(|| format!("invalid or destroyed handle: {id}"))
    }
    pub fn destroy(&mut self, id: u32) -> Result<(), String> {
        self.controls
            .remove(&id)
            .map(|_| ())
            .ok_or_else(|| format!("invalid or destroyed handle: {id}"))
    }
    pub fn live_count(&self) -> usize {
        self.controls.len()
    }
}

pub mod easing;

pub mod animated_icon;
pub mod icon_source;

pub mod shapes;
