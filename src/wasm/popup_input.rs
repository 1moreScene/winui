//! Host input islands for Rust-owned popup windows. Transparent targets receive
//! platform events; all hit testing, controls, focus and visuals remain in Scene.
use crate::model::Rect;
use std::{cell::RefCell, collections::HashMap, rc::Rc};
use wasm_bindgen::{prelude::*, JsCast};
use web_sys::{HtmlCanvasElement, HtmlElement};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = queueMicrotask)]
    fn queue_microtask(callback: &JsValue);
}

#[derive(Default)]
struct State {
    disposed: bool,
    queued: bool,
    regions: Vec<(u32, Rect)>,
    targets: HashMap<u32, HtmlElement>,
}

#[derive(Default)]
pub(super) struct PopupInput {
    state: Rc<RefCell<State>>,
}

impl PopupInput {
    pub fn sync(&self, canvas: &HtmlCanvasElement, regions: Vec<(u32, Rect)>) {
        let mut state = self.state.borrow_mut();
        if state.disposed || state.regions == regions && state.targets.len() == regions.len() {
            return;
        }
        state.regions = regions;
        if state.queued {
            return;
        }
        state.queued = true;
        drop(state);
        let state = self.state.clone();
        let canvas = canvas.clone();
        // The existing platform host projects the returned snapshot
        // synchronously. Attach after that projection, before the next input
        // event, including reduced-motion frames with no subsequent RAF.
        let callback = Closure::once_into_js(move || {
            if let Err(error) = project(&state, &canvas) {
                super::report_panic(&format!("Popup input projection failed: {error:?}"));
            }
        });
        queue_microtask(&callback);
    }
}

fn project(state: &RefCell<State>, canvas: &HtmlCanvasElement) -> Result<(), JsValue> {
    let mut state = state.borrow_mut();
    state.queued = false;
    if state.disposed {
        return Ok(());
    }
    let Some(portal) = canvas.parent_element() else {
        return Ok(());
    };
    let regions = state.regions.clone();
    state.targets.retain(|id, target| {
        let keep = regions.iter().any(|(owner, _)| owner == id);
        if !keep {
            target.remove();
        }
        keep
    });
    for (id, rect) in regions {
        let Some(group) = portal.query_selector(&format!("[data-scene-node=\"{id}\"]"))? else {
            continue;
        };
        let target = if let Some(target) = state.targets.get(&id) {
            target.clone()
        } else {
            let target = canvas
                .owner_document()
                .unwrap()
                .create_element("div")?
                .dyn_into::<HtmlElement>()?;
            target.set_attribute("data-winui-popup-input", &id.to_string())?;
            target.set_attribute("aria-hidden", "true")?;
            state.targets.insert(id, target.clone());
            target
        };
        target.style().set_css_text(&format!(
            "position:absolute;left:{}px;top:{}px;width:{}px;height:{}px;pointer-events:auto;background:transparent;",
            rect.x, rect.y, rect.width, rect.height
        ));
        // Stay under this popup's controls, but inside its own stacking order:
        // a higher popup's blank chrome must also cover a lower popup's inputs.
        if target.parent_element().as_ref() != Some(&group) {
            group.insert_before(&target, group.first_child().as_ref())?;
        }
    }
    Ok(())
}

impl Drop for PopupInput {
    fn drop(&mut self) {
        let mut state = self.state.borrow_mut();
        state.disposed = true;
        for (_, target) in state.targets.drain() {
            target.remove();
        }
    }
}
