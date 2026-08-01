use gpui::{
    App, FontWeight, IntoElement, RenderOnce, SharedString, Window, div, prelude::*, px,
    transparent_black,
};

use crate::theme::ActiveTheme;

#[allow(dead_code)]
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) enum BadgeVariant {
    #[default]
    Default,
    Secondary,
    Outline,
    Destructive,
}

#[derive(IntoElement)]
pub(crate) struct Badge {
    label: SharedString,
    variant: BadgeVariant,
}

impl Badge {
    pub(crate) fn new(label: impl Into<SharedString>) -> Self {
        Self {
            label: label.into(),
            variant: BadgeVariant::default(),
        }
    }

    pub(crate) fn variant(mut self, variant: BadgeVariant) -> Self {
        self.variant = variant;
        self
    }
}

impl RenderOnce for Badge {
    fn render(self, window: &mut Window, _cx: &mut App) -> impl IntoElement {
        let colors = window.theme().colors;
        let transparent = transparent_black();
        let (background, foreground, border) = match self.variant {
            BadgeVariant::Default => (colors.primary, colors.primary_foreground, transparent),
            BadgeVariant::Secondary => (colors.secondary, colors.secondary_foreground, transparent),
            BadgeVariant::Outline => (transparent, colors.foreground, colors.border),
            BadgeVariant::Destructive => (
                colors.destructive.opacity(0.1),
                colors.destructive,
                transparent,
            ),
        };

        div()
            .flex()
            .flex_none()
            .items_center()
            .h(px(20.0))
            .px(px(6.0))
            .rounded_full()
            .border_1()
            .border_color(border)
            .bg(background)
            .text_color(foreground)
            .text_size(px(10.0))
            .font_weight(FontWeight::MEDIUM)
            .whitespace_nowrap()
            .child(self.label)
    }
}
