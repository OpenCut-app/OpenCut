//! Editor-core timeline primitive: tracks of clips, with flow/fixed layout.
//!
//! A timeline is a top-level Editor API concept (exposed as
//! `editor.timelines`), so this is its own crate. `track` is NOT a
//! top-level concept — it's reached through `editor.timelines.tracks` —
//! so `track` is a module *inside* this crate, not its own crate (one
//! consumer: timeline → fold in).
//!
//! Layout is derived from track role, not chosen: the main track is flow
//! (clips are an ordered list, position = prefix sum of durations; no
//! stored positions); overlay and audio tracks are fixed (clips have a
//! stored `start_time`). There is no `layout` parameter on track creation
//! and no user-facing toggle — the editor core owns the assignment, so the
//! policy can't drift across consumers (web/desktop/mobile/MCP/scripting).
//! See architecture.md for the WHY.
//!
//! Takes `fps: RationalTime` as a constructor param rather than depending
//! on a `settings` crate — timelines need `fps` (narrow), not the whole
//! `Settings` struct (wide), and the coupling stays an explicit value,
//! not a hidden settings dep.

// Skeleton-phase: suppress stub warnings from `todo!()` bodies and
// unconsumed pub items. Remove this attribute when this crate gets real logic.
#![allow(unused, dead_code)]

mod error;
mod timeline;
mod track;

pub use error::TimelineError;
pub use timeline::Timeline;
pub use track::{Track, TrackLayout, TrackRole, TrackType};
