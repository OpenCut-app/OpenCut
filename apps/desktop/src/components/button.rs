use gpui::{
    App, ClickEvent, ElementId, FontWeight, IntoElement, MouseButton, RenderOnce, SharedString,
    Window, div, prelude::*, px, transparent_black,
};

use crate::theme::ActiveTheme;

#[allow(dead_code)]
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) enum ButtonVariant {
    #[default]
    Default,
    Outline,
    Secondary,
    Ghost,
    Destructive,
    Link,
}
#[allow(dead_code)]
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) enum ButtonSize {
    #[default]
    Default,
    XSmall,
    Small,
    Large,
    Icon,
    IconXSmall,
    IconSmall,
    IconLarge,
}

impl ButtonSize {
    fn height(self) -> f32 {
        match self {
            Self::XSmall | Self::IconXSmall => 20.0,
            Self::Small | Self::IconSmall => 24.0,
            Self::Default | Self::Icon => 28.0,
            Self::Large | Self::IconLarge => 32.0,
        }
    }

    fn horizontal_padding(self) -> f32 {
        match self {
            Self::XSmall | Self::Small | Self::Default => 8.0,
            Self::Large => 10.0,
            Self::Icon | Self::IconXSmall | Self::IconSmall | Self::IconLarge => 0.0,
        }
    }

    fn is_icon(self) -> bool {
        matches!(
            self,
            Self::Icon | Self::IconXSmall | Self::IconSmall | Self::IconLarge
        )
    }
}

type ClickHandler = Box<dyn Fn(&ClickEvent, &mut Window, &mut App) + 'static>;

#[derive(IntoElement)]
pub(crate) struct Button {
    id: ElementId,
    label: SharedString,
    variant: ButtonVariant,
    size: ButtonSize,
    disabled: bool,
    full_width: bool,
    on_click: Option<ClickHandler>,
}

impl Button {
    pub(crate) fn new(id: impl Into<ElementId>, label: impl Into<SharedString>) -> Self {
        Self {
            id: id.into(),
            label: label.into(),
            variant: ButtonVariant::default(),
            size: ButtonSize::default(),
            disabled: false,
            full_width: false,
            on_click: None,
        }
    }

    pub(crate) fn variant(mut self, variant: ButtonVariant) -> Self {
        self.variant = variant;
        self
    }

    pub(crate) fn size(mut self, size: ButtonSize) -> Self {
        self.size = size;
        self
    }

    #[allow(dead_code)]
    pub(crate) fn disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }

    #[allow(dead_code)]
    pub(crate) fn full_width(mut self) -> Self {
        self.full_width = true;
        self
    }

    pub(crate) fn on_click(
        mut self,
        handler: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
    ) -> Self {
        self.on_click = Some(Box::new(handler));
        self
    }
}

impl RenderOnce for Button {
    fn render(self, window: &mut Window, _cx: &mut App) -> impl IntoElement {
        let theme = window.theme();
        let colors = theme.colors;
        let transparent = transparent_black();

        let (background, foreground, border, hover, active) = match self.variant {
            ButtonVariant::Default => (
                colors.primary,
                colors.primary_foreground,
                transparent,
                colors.primary.opacity(0.8),
                colors.primary.opacity(0.7),
            ),
            ButtonVariant::Outline => (
                transparent,
                colors.foreground,
                colors.border,
                colors.input.opacity(0.5),
                colors.input,
            ),
            ButtonVariant::Secondary => (
                colors.secondary,
                colors.secondary_foreground,
                transparent,
                colors.secondary.opacity(0.8),
                colors.secondary.opacity(0.65),
            ),
            ButtonVariant::Ghost => (
                transparent,
                colors.foreground,
                transparent,
                colors.muted,
                colors.muted.opacity(0.75),
            ),
            ButtonVariant::Destructive => (
                colors.destructive.opacity(0.1),
                colors.destructive,
                transparent,
                colors.destructive.opacity(0.2),
                colors.destructive.opacity(0.3),
            ),
            ButtonVariant::Link => (
                transparent,
                colors.primary,
                transparent,
                transparent,
                transparent,
            ),
        };

        let height = px(self.size.height());
        let mut button = div()
            .id(self.id)
            .flex()
            .flex_none()
            .items_center()
            .justify_center()
            .h(height)
            .when(self.size.is_icon(), |this| this.w(height))
            .when(!self.size.is_icon(), |this| {
                this.px(px(self.size.horizontal_padding()))
            })
            .when(self.full_width, |this| this.w_full())
            .rounded(theme.radius)
            .border_1()
            .border_color(border)
            .bg(background)
            .text_color(foreground)
            .text_xs()
            .font_weight(FontWeight::MEDIUM)
            .whitespace_nowrap()
            .tab_index(0)
            .focus(|style| style.border_color(colors.ring))
            .child(self.label);

        if self.disabled {
            button = button.opacity(0.5).cursor_not_allowed();
        } else {
            button = button
                .cursor_pointer()
                .hover(move |style| {
                    let style = style.bg(hover);
                    if self.variant == ButtonVariant::Link {
                        style.underline()
                    } else {
                        style
                    }
                })
                .active(move |style| style.bg(active))
                .on_mouse_down(MouseButton::Left, |_, window, _| window.prevent_default())
                .when_some(self.on_click, |this, handler| {
                    this.on_click(move |event, window, cx| {
                        cx.stop_propagation();
                        handler(event, window, cx);
                    })
                });
        }

        button
    }
}
