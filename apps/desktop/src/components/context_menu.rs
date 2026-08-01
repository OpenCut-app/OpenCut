use std::rc::Rc;

use gpui::{
    AnyElement, App, ElementId, Entity, IntoElement, MouseButton, Pixels, Point, Render,
    SharedString, Window, anchored, deferred, div, prelude::*, px,
};

use crate::theme::ActiveTheme;

type SelectHandler = Rc<dyn Fn(&mut Window, &mut App) + 'static>;

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) enum ContextMenuItemVariant {
    #[default]
    Default,
    Destructive,
}
pub(crate) enum ContextMenuItem {
    Entry {
        label: SharedString,
        shortcut: Option<SharedString>,
        checked: Option<bool>,
        disabled: bool,
        variant: ContextMenuItemVariant,
        on_select: SelectHandler,
    },
    Label(SharedString),
    Separator,
}

impl ContextMenuItem {
    pub(crate) fn entry(label: impl Into<SharedString>) -> Self {
        Self::Entry {
            label: label.into(),
            shortcut: None,
            checked: None,
            disabled: false,
            variant: ContextMenuItemVariant::Default,
            on_select: Rc::new(|_, _| {}),
        }
    }

    pub(crate) fn label(label: impl Into<SharedString>) -> Self {
        Self::Label(label.into())
    }

    pub(crate) fn separator() -> Self {
        Self::Separator
    }

    pub(crate) fn shortcut(mut self, shortcut: impl Into<SharedString>) -> Self {
        if let Self::Entry {
            shortcut: item_shortcut,
            ..
        } = &mut self
        {
            *item_shortcut = Some(shortcut.into());
        }
        self
    }

    pub(crate) fn checked(mut self, checked: bool) -> Self {
        if let Self::Entry {
            checked: item_checked,
            ..
        } = &mut self
        {
            *item_checked = Some(checked);
        }
        self
    }

    pub(crate) fn disabled(mut self, disabled: bool) -> Self {
        if let Self::Entry {
            disabled: item_disabled,
            ..
        } = &mut self
        {
            *item_disabled = disabled;
        }
        self
    }

    pub(crate) fn variant(mut self, variant: ContextMenuItemVariant) -> Self {
        if let Self::Entry {
            variant: item_variant,
            ..
        } = &mut self
        {
            *item_variant = variant;
        }
        self
    }

    pub(crate) fn on_select(mut self, handler: impl Fn(&mut Window, &mut App) + 'static) -> Self {
        if let Self::Entry {
            on_select: item_handler,
            ..
        } = &mut self
        {
            *item_handler = Rc::new(handler);
        }
        self
    }
}

pub(crate) struct ContextMenu {
    items: Vec<ContextMenuItem>,
    position: Option<Point<Pixels>>,
}

impl ContextMenu {
    pub(crate) fn new(items: impl IntoIterator<Item = ContextMenuItem>) -> Self {
        Self {
            items: items.into_iter().collect(),
            position: None,
        }
    }

    fn open(&mut self, position: Point<Pixels>, cx: &mut gpui::Context<Self>) {
        self.position = Some(position);
        cx.notify();
    }

    fn close(&mut self, cx: &mut gpui::Context<Self>) {
        self.position = None;
        cx.notify();
    }

    fn activate(&mut self, index: usize, window: &mut Window, cx: &mut gpui::Context<Self>) {
        let Some(ContextMenuItem::Entry {
            disabled,
            on_select,
            ..
        }) = self.items.get(index)
        else {
            return;
        };
        if *disabled {
            return;
        }

        let on_select = Rc::clone(on_select);
        self.close(cx);
        on_select(window, cx);
    }
}

impl Render for ContextMenu {
    fn render(&mut self, window: &mut Window, cx: &mut gpui::Context<Self>) -> impl IntoElement {
        let Some(position) = self.position else {
            return div().into_any_element();
        };

        let theme = window.theme();
        let colors = theme.colors;
        let items = self
            .items
            .iter()
            .enumerate()
            .map(|(index, item)| -> AnyElement {
                match item {
                    ContextMenuItem::Entry {
                        label,
                        shortcut,
                        checked,
                        disabled,
                        variant,
                        ..
                    } => {
                        let foreground = if *variant == ContextMenuItemVariant::Destructive {
                            colors.destructive
                        } else {
                            colors.popover_foreground
                        };
                        let hover = if *variant == ContextMenuItemVariant::Destructive {
                            colors.destructive.opacity(0.1)
                        } else {
                            colors.accent
                        };

                        div()
                            .id(("context-menu-item", index))
                            .flex()
                            .items_center()
                            .gap(px(8.0))
                            .min_h(px(28.0))
                            .px(px(8.0))
                            .py(px(4.0))
                            .rounded(px(5.0))
                            .text_xs()
                            .text_color(foreground)
                            .when(*disabled, |this| this.opacity(0.5).cursor_not_allowed())
                            .when(!*disabled, |this| {
                                this.cursor_default()
                                    .hover(move |style| style.bg(hover))
                                    .on_click(cx.listener(move |this, _, window, cx| {
                                        this.activate(index, window, cx);
                                        cx.stop_propagation();
                                    }))
                            })
                            .child(
                                div()
                                    .w(px(12.0))
                                    .text_center()
                                    .child(if checked == &Some(true) { "✓" } else { "" }),
                            )
                            .child(div().flex_1().child(label.clone()))
                            .when_some(shortcut.clone(), |this, shortcut| {
                                this.child(
                                    div()
                                        .text_size(px(10.0))
                                        .text_color(colors.muted_foreground)
                                        .child(shortcut),
                                )
                            })
                            .into_any_element()
                    }
                    ContextMenuItem::Label(label) => div()
                        .px(px(8.0))
                        .py(px(6.0))
                        .text_xs()
                        .text_color(colors.muted_foreground)
                        .child(label.clone())
                        .into_any_element(),
                    ContextMenuItem::Separator => div()
                        .h(px(1.0))
                        .mx(px(-4.0))
                        .my(px(4.0))
                        .bg(colors.border.opacity(0.5))
                        .into_any_element(),
                }
            })
            .collect::<Vec<_>>();

        deferred(
            anchored()
                .position(position)
                .snap_to_window_with_margin(px(8.0))
                .child(
                    div()
                        .id("context-menu-content")
                        .occlude()
                        .min_w(px(160.0))
                        .max_h(window.viewport_size().height - px(16.0))
                        .overflow_y_scroll()
                        .p(px(4.0))
                        .rounded(theme.radius)
                        .bg(colors.popover)
                        .text_color(colors.popover_foreground)
                        .border_1()
                        .border_color(colors.foreground.opacity(0.1))
                        .shadow_md()
                        .on_mouse_down_out(cx.listener(|this, _, _, cx| this.close(cx)))
                        .children(items),
                ),
        )
        .with_priority(1)
        .into_any_element()
    }
}

pub(crate) fn context_menu_trigger(
    id: impl Into<ElementId>,
    child: impl IntoElement,
    menu: Entity<ContextMenu>,
) -> impl IntoElement {
    div().id(id).size_full().child(child).on_mouse_down(
        MouseButton::Right,
        move |event, window, cx| {
            window.prevent_default();
            cx.stop_propagation();
            menu.update(cx, |menu, cx| menu.open(event.position, cx));
        },
    )
}
