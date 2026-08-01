use gpui::{
    AnyView, AppContext, ClickEvent, Context, DragMoveEvent, Entity, IntoElement, Render, Window,
    div, prelude::*, px, relative,
};

use crate::theme::ActiveTheme;

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) enum Orientation {
    #[default]
    Horizontal,
    Vertical,
}

#[derive(Debug)]
struct ResizeDrag;

fn clamp_fraction(fraction: f32, minimum_fraction: f32) -> f32 {
    fraction.clamp(minimum_fraction, 1.0 - minimum_fraction)
}

pub(crate) struct ResizablePanelGroup {
    orientation: Orientation,
    first: AnyView,
    second: AnyView,
    initial_fraction: f32,
    fraction: f32,
    minimum_fraction: f32,
}

impl ResizablePanelGroup {
    pub(crate) fn new<A, B>(orientation: Orientation, first: Entity<A>, second: Entity<B>) -> Self
    where
        A: Render,
        B: Render,
    {
        Self {
            orientation,
            first: first.into(),
            second: second.into(),
            initial_fraction: 0.5,
            fraction: 0.5,
            minimum_fraction: 0.1,
        }
    }

    pub(crate) fn initial_fraction(mut self, fraction: f32) -> Self {
        let fraction = self.clamp_fraction(fraction);
        self.initial_fraction = fraction;
        self.fraction = fraction;
        self
    }

    pub(crate) fn minimum_fraction(mut self, fraction: f32) -> Self {
        self.minimum_fraction = fraction.clamp(0.0, 0.49);
        self.initial_fraction = self.clamp_fraction(self.initial_fraction);
        self.fraction = self.clamp_fraction(self.fraction);
        self
    }

    fn clamp_fraction(&self, fraction: f32) -> f32 {
        clamp_fraction(fraction, self.minimum_fraction)
    }

    fn resize(
        &mut self,
        event: &DragMoveEvent<ResizeDrag>,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        let bounds = event.bounds;
        let fraction = match self.orientation {
            Orientation::Horizontal => {
                (event.event.position.x - bounds.left()) / (bounds.right() - bounds.left())
            }
            Orientation::Vertical => {
                (event.event.position.y - bounds.top()) / (bounds.bottom() - bounds.top())
            }
        };

        self.fraction = self.clamp_fraction(fraction);
        cx.notify();
    }

    fn reset(&mut self, cx: &mut Context<Self>) {
        self.fraction = self.initial_fraction;
        cx.notify();
    }
}

impl Render for ResizablePanelGroup {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let colors = window.theme().colors;
        let orientation = self.orientation;
        let first_fraction = self.fraction;

        let handle = div()
            .id("resizable-handle")
            .flex()
            .flex_none()
            .items_center()
            .justify_center()
            .when(orientation == Orientation::Horizontal, |this| {
                this.w(px(5.0)).h_full().cursor_col_resize().child(
                    div()
                        .w(px(1.0))
                        .h_full()
                        .bg(colors.border)
                        .group_hover("resizable", |style| style.bg(colors.ring)),
                )
            })
            .when(orientation == Orientation::Vertical, |this| {
                this.h(px(5.0)).w_full().cursor_row_resize().child(
                    div()
                        .h(px(1.0))
                        .w_full()
                        .bg(colors.border)
                        .group_hover("resizable", |style| style.bg(colors.ring)),
                )
            })
            .group("resizable")
            .on_click(cx.listener(|this, event: &ClickEvent, _, cx| {
                if event.click_count() >= 2 {
                    this.reset(cx);
                }
                cx.stop_propagation();
            }))
            .on_drag(ResizeDrag, |_, _, _, cx| cx.new(|_| gpui::Empty));

        div()
            .id("resizable-panel-group")
            .flex()
            .size_full()
            .overflow_hidden()
            .when(orientation == Orientation::Vertical, |this| this.flex_col())
            .on_drag_move::<ResizeDrag>(cx.listener(Self::resize))
            .child(
                div()
                    .flex_none()
                    .overflow_hidden()
                    .when(orientation == Orientation::Horizontal, |this| {
                        this.w(relative(first_fraction)).h_full()
                    })
                    .when(orientation == Orientation::Vertical, |this| {
                        this.h(relative(first_fraction)).w_full()
                    })
                    .child(self.first.clone()),
            )
            .child(handle)
            .child(
                div()
                    .flex_1()
                    .min_w_0()
                    .min_h_0()
                    .child(self.second.clone()),
            )
    }
}

#[cfg(test)]
mod tests {
    use super::clamp_fraction;

    #[test]
    fn panel_fraction_respects_both_minimums() {
        assert_eq!(clamp_fraction(-1.0, 0.2), 0.2);
        assert_eq!(clamp_fraction(0.45, 0.2), 0.45);
        assert_eq!(clamp_fraction(2.0, 0.2), 0.8);
    }
}
