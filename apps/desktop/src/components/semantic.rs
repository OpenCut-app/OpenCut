use gpui::{Rems, Styled, Window};

use crate::theme::{ActiveTheme, Theme};

/// Resolves the active theme for the current window. This is the sole bridge
/// from UI components to the runtime theme source.
pub fn theme(window: &Window) -> &'static Theme {
    window.theme()
}

/// Tailwind-like semantic styling helpers for GPUI [`Styled`] elements.
pub trait SemanticStyled: Styled {
    fn bg_background(self, theme: &Theme) -> Self {
        self.bg(theme.colors.background)
    }

    fn bg_card(self, theme: &Theme) -> Self {
        self.bg(theme.colors.card)
    }

    fn bg_popover(self, theme: &Theme) -> Self {
        self.bg(theme.colors.popover)
    }

    fn bg_primary(self, theme: &Theme) -> Self {
        self.bg(theme.colors.primary)
    }

    fn bg_secondary(self, theme: &Theme) -> Self {
        self.bg(theme.colors.secondary)
    }

    fn bg_muted(self, theme: &Theme) -> Self {
        self.bg(theme.colors.muted)
    }

    fn bg_accent(self, theme: &Theme) -> Self {
        self.bg(theme.colors.accent)
    }

    fn bg_destructive(self, theme: &Theme) -> Self {
        self.bg(theme.colors.destructive)
    }

    fn bg_input(self, theme: &Theme) -> Self {
        self.bg(theme.colors.input)
    }

    fn bg_sidebar(self, theme: &Theme) -> Self {
        self.bg(theme.colors.sidebar)
    }

    fn bg_sidebar_primary(self, theme: &Theme) -> Self {
        self.bg(theme.colors.sidebar_primary)
    }

    fn bg_sidebar_accent(self, theme: &Theme) -> Self {
        self.bg(theme.colors.sidebar_accent)
    }

    fn bg_chart_1(self, theme: &Theme) -> Self {
        self.bg(theme.colors.chart_1)
    }

    fn bg_chart_2(self, theme: &Theme) -> Self {
        self.bg(theme.colors.chart_2)
    }

    fn bg_chart_3(self, theme: &Theme) -> Self {
        self.bg(theme.colors.chart_3)
    }

    fn bg_chart_4(self, theme: &Theme) -> Self {
        self.bg(theme.colors.chart_4)
    }

    fn bg_chart_5(self, theme: &Theme) -> Self {
        self.bg(theme.colors.chart_5)
    }

    fn bg_border_subtle(self, theme: &Theme) -> Self {
        self.bg(theme.colors.border.opacity(0.5))
    }

    fn bg_border(self, theme: &Theme) -> Self {
        self.bg(theme.colors.border)
    }

    fn bg_ring(self, theme: &Theme) -> Self {
        self.bg(theme.colors.ring)
    }

    fn text_foreground(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.foreground)
    }

    fn text_card_foreground(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.card_foreground)
    }

    fn text_popover_foreground(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.popover_foreground)
    }

    fn text_primary(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.primary)
    }

    fn text_primary_foreground(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.primary_foreground)
    }

    fn text_secondary_foreground(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.secondary_foreground)
    }

    fn text_muted_foreground(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.muted_foreground)
    }

    fn text_accent_foreground(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.accent_foreground)
    }

    fn text_destructive(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.destructive)
    }

    fn text_sidebar_foreground(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.sidebar_foreground)
    }

    fn text_sidebar_primary_foreground(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.sidebar_primary_foreground)
    }

    fn text_sidebar_accent_foreground(self, theme: &Theme) -> Self {
        self.text_color(theme.colors.sidebar_accent_foreground)
    }

    fn border_border(self, theme: &Theme) -> Self {
        self.border_color(theme.colors.border)
    }

    fn border_input(self, theme: &Theme) -> Self {
        self.border_color(theme.colors.input)
    }

    fn border_ring(self, theme: &Theme) -> Self {
        self.border_color(theme.colors.ring)
    }

    fn border_sidebar(self, theme: &Theme) -> Self {
        self.border_color(theme.colors.sidebar_border)
    }

    fn border_sidebar_ring(self, theme: &Theme) -> Self {
        self.border_color(theme.colors.sidebar_ring)
    }

    fn border_foreground_muted(self, theme: &Theme) -> Self {
        self.border_color(theme.colors.foreground.opacity(0.1))
    }

    fn rounded_theme(self, theme: &Theme) -> Self {
        self.rounded(theme.radius)
    }

    fn rounded_sm(self, theme: &Theme) -> Self {
        self.rounded(theme_radius(theme.radius, 0.6))
    }

    fn rounded_md(self, theme: &Theme) -> Self {
        self.rounded(theme_radius(theme.radius, 0.8))
    }

    fn rounded_lg(self, theme: &Theme) -> Self {
        self.rounded(theme.radius)
    }
}

impl<E: Styled> SemanticStyled for E {}

fn theme_radius(base: Rems, scale: f32) -> Rems {
    gpui::rems(base.0 * scale)
}
