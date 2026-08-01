use gpui::{App, FontWeight, IntoElement, RenderOnce, SharedString, Window, div, prelude::*};

use crate::theme::ActiveTheme;

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
        let colors = window.theme().colors;

        div()
            .text_xs()
            .font_weight(FontWeight::MEDIUM)
            .text_color(if self.muted {
                colors.muted_foreground
            } else {
                colors.foreground
            })
            .when(self.disabled, |this| this.opacity(0.5))
            .child(self.text)
    }
}
