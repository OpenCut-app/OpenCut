//! A timeline: an ordered collection of tracks.
//!
//! Multiple timelines compose, but not by timeline-level nesting — a
//! timeline that wants to reuse another as a black-box unit places a
//! `clips::CompoundClip` on a track, exactly like placing a video clip.
//! There is no separate "nested timeline" concept here: no offset, no
//! reference list, nothing to keep in sync with track/clip placement.
//! See architecture.md, "Editor core — Compound clips" for why an
//! earlier `nested: Vec<NestedTimelineRef>` field (a floating
//! `{timeline_id, offset}` pair with no track, no duration, not
//! selectable or trimmable as a clip) was replaced by this.

use crate::error::TimelineError;
use crate::track::{track_order_index, Track, TrackRole, TrackType};
use ids::{TimelineId, TrackId};
use time::RationalTime;

/// `tracks` is private: it carries the "main track can never be deleted"
/// and track-order (Audio → Main → Overlay) invariants. Direct mutation
/// would bypass the command pipeline. Read access is unrestricted;
/// mutating methods land when `commands` gets real logic (see
/// architecture.md, "Error handling strategy" — their signatures depend
/// on the error type they reject with).
pub struct Timeline {
    pub id: TimelineId,
    pub fps: RationalTime,
    tracks: Vec<Track>,
    next_track_id: u64,
}

impl Timeline {
    /// A fresh timeline with its always-present main track already
    /// created. The only timeline-creation path — see
    /// architecture.md, "Editor core — Timeline/Track construction".
    pub fn new(id: TimelineId, fps: RationalTime) -> Self {
        let mut timeline = Self {
            id,
            fps,
            tracks: Vec::new(),
            next_track_id: 0,
        };
        timeline
            .create_track(TrackRole::Main, TrackType::Video)
            .expect("a freshly constructed timeline has no tracks yet, so creating its first (main) track can never hit DuplicateMainTrack");
        timeline
    }

    /// Creates a track, mints its id, and inserts it at the position
    /// that preserves Audio → Main → Overlay order (see
    /// `track_order_index`). Rejects a second `Main`-role track — there
    /// is exactly one per timeline, created only by `Timeline::new`.
    pub fn create_track(
        &mut self,
        role: TrackRole,
        kind: TrackType,
    ) -> Result<TrackId, TimelineError> {
        if role == TrackRole::Main && self.tracks.iter().any(|t| t.role == TrackRole::Main) {
            return Err(TimelineError::DuplicateMainTrack);
        }
        let id = TrackId(self.next_track_id);
        self.next_track_id += 1;
        let insert_at = self
            .tracks
            .iter()
            .position(|t| track_order_index(t.role) > track_order_index(role))
            .unwrap_or(self.tracks.len());
        self.tracks.insert(insert_at, Track::new(id, role, kind));
        Ok(id)
    }

    /// Removes and returns a track. Rejects removing the main track —
    /// by design, it can never be deleted. Panics if `track_id` doesn't
    /// name a track on this timeline: that's a caller-contract
    /// violation, not a graceful domain rejection (same reasoning as
    /// `editor_api::Editor::set_active_timeline`'s `.expect(...)`).
    pub fn remove_track(&mut self, track_id: TrackId) -> Result<Track, TimelineError> {
        let index = self
            .tracks
            .iter()
            .position(|t| t.id == track_id)
            .expect("caller-guaranteed: track_id names a track on this timeline");
        if self.tracks[index].role == TrackRole::Main {
            return Err(TimelineError::CannotDeleteMainTrack);
        }
        Ok(self.tracks.remove(index))
    }

    pub fn tracks(&self) -> &[Track] {
        &self.tracks
    }

    /// The latest point in time any clip on any track extends to. A pure
    /// query, not a stored/cached value — needed to clamp the playhead
    /// into bounds on seek and on active-timeline switch, see
    /// `session::Session::set_playhead`/`set_active_timeline`.
    pub fn duration(&self) -> RationalTime {
        todo!("max over tracks of (their last clip's end point); zero for an empty timeline")
    }
}
