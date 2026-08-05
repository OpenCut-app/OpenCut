//! Failure modes for timeline/track construction and mutation. A closed,
//! user-actionable set — see architecture.md, "Error handling strategy"
//! (thiserror for domain leaves with distinguishable failures).

use thiserror::Error;

#[derive(Debug, Error)]
pub enum TimelineError {
    #[error("a timeline can only have one main track")]
    DuplicateMainTrack,
    #[error("the main track can never be deleted")]
    CannotDeleteMainTrack,
}
