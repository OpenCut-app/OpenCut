use gpui::{App, IntoElement, RenderOnce, Window, div, prelude::*, px};

use crate::{components::Orientation, theme::ActiveTheme};

#[derive(IntoElement)]
pub(crate) struct Separator {
    orientation: Orientation,
}

impl Separator {
    pub(crate) fn horizontal() -> Self {
        Self {
            orientation: Orientation::Horizontal,
        }
    }

    #[allow(dead_code)]
    pub(crate) fn vertical() -> Self {
        Self {
            orientation: Orientation::Vertical,
        }
    }
}

impl RenderOnce for Separator {
    fn render(self, window: &mut Window, _cx: &mut App) -> impl IntoElement {
        let color = window.theme().colors.border.opacity(0.5);

        div()
            .flex_none()
            .bg(color)
            .map(|this| match self.orientation {
                Orientation::Horizontal => this.w_full().h(px(1.0)),
                Orientation::Vertical => this.h_full().w(px(1.0)),
            })
    }
}
