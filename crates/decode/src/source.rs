use std::path::PathBuf;
use std::sync::Arc;

/// A decodable media input.
#[derive(Clone, Debug)]
pub enum Source {
    Path(PathBuf),
    Bytes(Arc<[u8]>),
}

/// Opaque id assigned when a source is opened.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct SourceId(u64);

impl SourceId {
    pub fn new(id: u64) -> Self {
        Self(id)
    }

    pub fn raw(&self) -> u64 {
        self.0
    }
}

/// Opaque id for one stream within a source.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct SourceStreamId(u64);

impl SourceStreamId {
    pub fn new(id: u64) -> Self {
        Self(id)
    }

    pub fn raw(&self) -> u64 {
        self.0
    }
}

/// One video stream of a decoded source.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SourceStream {
    pub id: SourceStreamId,
    pub frame_rate: time::FrameRate,
    pub width: u32,
    pub height: u32,
    pub duration: time::RationalTime,
}
