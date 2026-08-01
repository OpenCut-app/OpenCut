use gpui::{App, FontWeight, IntoElement, RenderOnce, SharedString, Window, div};

use crate::components::prelude::*;

#[derive(IntoElement)]
pub(crate) struct Label {
    text: SharedString,
    muted: bool,
    disabled: bool,
}

impl Label {
    pub(crate) fn new(text: impl Into<SharedString>) -> Self {
        Self {
            text: text.into(),
            muted: false,
            disabled: false,
        }
    }

    pub(crate) fn muted(mut self) -> Self {
        self.muted = true;
        self
    }

    #[allow(dead_code)]
    pub(crate) fn disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }
}

impl RenderOnce for Label {
    fn render(self, window: &mut Window, _cx: &mut App) -> impl IntoElement {
        let theme = theme(window);

        div()
            .text_xs()
            .font_weight(FontWeight::MEDIUM)
            .when(self.muted, |this| this.text_muted_foreground(theme))
            .when(!self.muted, |this| this.text_foreground(theme))
            .when(self.disabled, |this| this.opacity(0.5))
            .child(self.text)
    }
}
