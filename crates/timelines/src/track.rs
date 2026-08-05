//! A track: a lane of clips with a role that determines its layout.
//!
//! Layout is derived from `TrackRole` — main is flow (clips are an ordered
//! list, position = prefix sum of durations; no stored positions),
//! overlay and audio are fixed (clips have a stored `start_time`). The
//! editor core owns this assignment; it is not a parameter on track
//! creation and there is no user-facing toggle. See architecture.md for WHY.

use clips::Clip;
use ids::TrackId;
use time::RationalTime;

/// `clips` is private: it carries the no-overlap invariant and, on a flow
/// track, order *is* position (prefix sum of durations) so reordering or
/// splicing it directly would silently reposition every clip after the
/// edit with no history entry. Read access is unrestricted; mutating
/// methods (`insert_clip`, etc.) land when `commands` gets real logic —
/// see architecture.md, "Error handling strategy".
///
/// `Clone`: `event_log::Primitive::TrackCreated`/`TrackDeleted` embed a full
/// `Track` snapshot — undo/redo needs the complete content to recreate what
/// was destroyed (or redo what was created), not just its id.
#[derive(Clone, Debug)]
pub struct Track {
    pub id: TrackId,
    pub role: TrackRole,
    pub kind: TrackType,
    clips: Vec<Clip>,
    pub muted: bool,
    pub hidden: bool,
}

impl Track {
    /// Constructs an empty track. Not `pub` outside this crate's own
    /// creation path — callers go through `Timeline::create_track`,
    /// which mints the id (see architecture.md, "Editor core —
    /// Timeline/Track construction"); nothing outside this crate is
    /// meant to hand-assemble a `Track` with an arbitrary id.
    pub(crate) fn new(id: TrackId, role: TrackRole, kind: TrackType) -> Self {
        Self {
            id,
            role,
            kind,
            clips: Vec::new(),
            muted: false,
            hidden: false,
        }
    }

    pub fn clips(&self) -> &[Clip] {
        &self.clips
    }

    /// The clip active at a point in time, if any. Needed to compile a
    /// frame at a time (see the `compositor` crate) and, later, for
    /// selection/hit-testing. A pure query, not a stored/cached value.
    pub fn clip_at(&self, at: RationalTime) -> Option<&Clip> {
        todo!(
            "flow layout: walk clips summing duration until `at` falls within one; \
             fixed layout: find the clip whose [start_time, start_time + duration) \
             contains `at`"
        )
    }
}

/// What a track is for. Determines layout (derived, not chosen) and where
/// the track sits in the track order.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TrackRole {
    /// The main video track. Flow layout. One per timeline, never deleted.
    Main,
    /// An overlay track (video/image/text/vector/adjustment/effect). Fixed.
    Overlay,
    /// An audio track. Fixed.
    Audio,
}

/// The closed enum of track types. A video track holds video, image, and
/// compound clips (a compound clip is a black-box reference to another
/// timeline — see `clips::CompoundClip` — folded into the same track type
/// as image rather than getting its own, since it renders like one);
/// audio holds audio; text holds text; vector holds vector; etc.
#[derive(Clone, Debug)]
pub enum TrackType {
    Video,
    Audio,
    Text,
    Vector,
    Adjustment,
    Effect,
}

/// How a track lays its clips out. Derived from `TrackRole`, never set directly.
pub enum TrackLayout {
    /// Clips are an ordered list; position = prefix sum of durations.
    Flow,
    /// Clips have a stored `start_time`. Nothing moves unless commanded.
    Fixed,
}

impl TrackRole {
    /// The layout this role implies. The single source of truth for the
    /// role→layout derivation — consumers call this, never a `layout` field.
    pub fn layout(&self) -> TrackLayout {
        match self {
            TrackRole::Main => TrackLayout::Flow,
            TrackRole::Overlay | TrackRole::Audio => TrackLayout::Fixed,
        }
    }
}

/// Track order from bottom: Audio → Main (video) → Overlay. Enforced
/// elsewhere (the document layer that owns the track collection); this is
/// the vocabulary, not the policy.
pub fn track_order_index(role: TrackRole) -> usize {
    match role {
        TrackRole::Audio => 0,
        TrackRole::Main => 1,
        TrackRole::Overlay => 2,
    }
}
