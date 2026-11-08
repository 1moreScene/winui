use crate::{model::Rect, navigation::NavigationView};

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Size {
    pub width: f64,
    pub height: f64,
}
impl Size {
    pub fn new(width: f64, height: f64) -> Result<Self, String> {
        if !width.is_finite() || !height.is_finite() || width < 0. || height < 0. {
            return Err("layout constraints must be finite and nonnegative".into());
        }
        Ok(Self { width, height })
    }
}
/// Measure has no side effects. Arrange commits viewport bounds and arranged parts.
/// This slice supports a NavigationView root with its item/header/separator tree.
pub trait LayoutNode {
    fn measure(&self, available: Size) -> Size;
    fn arrange(&mut self, final_size: Size) -> Rect;
}
impl LayoutNode for NavigationView {
    fn measure(&self, available: Size) -> Size {
        let pane = if self.props.is_pane_visible {
            self.props.open_pane_length
        } else {
            0.
        };
        Size {
            width: available.width.min(pane + 320.),
            height: available.height.min(400.),
        }
    }
    fn arrange(&mut self, final_size: Size) -> Rect {
        self.width = final_size.width;
        self.height = final_size.height;
        self.adapt();
        self.layout();
        Rect::new(0., 0., self.width, self.height)
    }
}
