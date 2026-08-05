//! The OpenCut project document: the root that composes timelines,
//! assets, bindings, and the event stream.
//!
//! The `Project` is the document — the `.opencut` file (secretly SQLite).
//! It owns the data that's persisted: project-level settings, timelines,
//! assets, bindings, and the history event stream (event sourcing).
//! It is the top of the document-model dependency graph: nothing
//! internal depends on it — only the Editor API does.
//!
//! `settings` is a module *inside* this crate, not its own crate:
//! it has one consumer (`Project`), and consumers reach it
//! transitively through `editor.project.settings` (the Editor API
//! surface list names "projects", not "settings" — so settings
//! is folded in). Timelines take `fps` as a constructor param rather
//! than depending on a `settings` crate — narrow need, explicit
//! coupling, no cycle. See architecture.md for the WHY.
//!
//! Commands, history, registries, and config are runtime concerns, not
//! part of the persisted document. The editor session (active timeline,
//! playhead, selection, scroll, history-browse cursor — see the
//! `session` crate) is *also* not a field here, for the same reason,
//! even though it's persisted too now: it's ephemeral view state, not
//! document content, and `Editor` writes/reads it separately through
//! the storage driver rather than folding it into this struct — see
//! architecture.md, "Editor core — Session".

// Skeleton-phase: suppress stub warnings from `todo!()` bodies and
// unconsumed pub items. Remove this attribute when this crate gets real logic.
#![allow(unused, dead_code)]

mod settings;

use assets::Asset;
use bindings::BindingGraph;
use event_log::{Entry, Event};
use ids::TimelineId;
use parts::Parts;
use settings::Settings;
use timelines::Timeline;

pub use settings::{Resolution, ResolutionPreset};

/// The project document.
///
/// `timelines`, `assets`, `bindings`, and `event_stream` are all
/// private: each carries an invariant direct mutation would let callers
/// bypass. `timelines` — the main timeline always exists. `event_stream`
/// — append-only, `seq` must be assigned by one authority, never
/// reordered or edited (undo/redo depend on this — see the `history`
/// crate). `assets`/`bindings` — for the same reason as `timelines`,
/// even though nothing enforces an invariant on them yet: a document
/// field a command can reach should not *also* be reachable by
/// unmediated direct mutation, or "run it through commands" stops being
/// true.
///
/// Read access is unrestricted. There are exactly two ways to mutate:
/// `parts()` (the command/undo-redo pipeline's mutation surface) and
/// `append()` (the sole way the event stream grows). Both are `pub` at
/// the Rust-visibility level — `editor_api` is a different crate — but
/// the actual protection is which crate can construct a `&mut Project`
/// in the first place: `editor_api::Editor` owns the only one, privately,
/// and only calls these from inside `run_command`/`undo`/`redo`. See
/// architecture.md, "Error handling strategy".
pub struct Project {
    /// Document metadata, not a setting.
    pub name: String,
    pub settings: Settings,
    timelines: Vec<Timeline>,
    next_timeline_id: u64,
    assets: Vec<Asset>,
    bindings: BindingGraph,
    /// The append-only event stream (event sourcing). Persisted as
    /// data; replayed by the `history` system, not here.
    event_stream: Vec<Event>,
}

impl Project {
    /// A new empty project at the given fps. The main timeline is
    /// created with the project and can never be deleted.
    pub fn new(name: String, settings: Settings) -> Self {
        let main_timeline_id = TimelineId(0);
        let main_timeline = Timeline::new(main_timeline_id, settings.fps);
        Self {
            name,
            settings,
            timelines: vec![main_timeline],
            next_timeline_id: 1,
            assets: Vec::new(),
            bindings: BindingGraph::new(),
            event_stream: Vec::new(),
        }
    }

    pub fn timelines(&self) -> &[Timeline] {
        &self.timelines
    }

    pub fn assets(&self) -> &[Asset] {
        &self.assets
    }

    pub fn bindings(&self) -> &BindingGraph {
        &self.bindings
    }

    pub fn event_stream(&self) -> &[Event] {
        &self.event_stream
    }

    /// The main timeline. Always present, never deleted. Index 0 is the
    /// main timeline by construction — pushed first in `new`, and nothing
    /// removes index 0.
    pub fn main_timeline_id(&self) -> TimelineId {
        self.timelines[0].id
    }

    /// Borrow the parts a command or an undo/redo application mutates.
    /// The only way to get mutable access to `timelines`/`assets`/
    /// `bindings` — see the struct doc for why those three, and not just
    /// `timelines`, are gated this way.
    pub fn parts(&mut self) -> Parts<'_> {
        Parts {
            timelines: &mut self.timelines,
            assets: &mut self.assets,
            bindings: &mut self.bindings,
        }
    }

    /// Direct, narrow mutable access to the asset list, for
    /// `asset_registry`. Deliberately *not* `parts()` — importing an
    /// asset doesn't go through the command pipeline (there's no
    /// `Primitive::AssetImported` yet, so it isn't undoable today; an
    /// acknowledged gap, not a design decision — see `event_log`'s
    /// primitive vocabulary).
    pub fn assets_mut(&mut self) -> &mut Vec<Asset> {
        &mut self.assets
    }

    /// The only way the event stream grows. Assigns the next `seq`
    /// (the stream's current length — append-only means `seq` and index
    /// always agree) and returns it, so the caller can build the next
    /// entry's `reverts` link.
    pub fn append(&mut self, entry: Entry) -> u64 {
        todo!("seq = self.event_stream.len() as u64; push the Event built from entry and seq; return seq")
    }
}
