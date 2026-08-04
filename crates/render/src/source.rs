use std::collections::HashMap;

use decode::{SourceId, SourceStream, SourceStreamId};

#[derive(Debug, Default)]
pub struct SourceRegistry {
    sources: HashMap<SourceId, Vec<SourceStream>>,
}

impl SourceRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn insert(&mut self, id: SourceId, streams: Vec<SourceStream>) {
        self.sources.insert(id, streams);
    }

    pub fn remove(&mut self, id: SourceId) -> bool {
        self.sources.remove(&id).is_some()
    }

    pub fn contains(&self, id: SourceId) -> bool {
        self.sources.contains_key(&id)
    }

    pub fn streams(&self, id: SourceId) -> Option<&[SourceStream]> {
        self.sources.get(&id).map(Vec::as_slice)
    }
}

#[derive(Debug, Default)]
pub struct FrameCache {
    entries: HashMap<(SourceId, SourceStreamId, time::RationalTime), decode::Frame>,
}

impl FrameCache {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get(
        &self,
        source: SourceId,
        stream: SourceStreamId,
        time: time::RationalTime,
    ) -> Option<&decode::Frame> {
        self.entries.get(&(source, stream, time))
    }

    pub fn insert(
        &mut self,
        source: SourceId,
        stream: SourceStreamId,
        time: time::RationalTime,
        frame: decode::Frame,
    ) {
        self.entries.insert((source, stream, time), frame);
    }

    pub fn flush_source(&mut self, source: SourceId) {
        self.entries.retain(|(sid, _, _), _| *sid != source);
    }
}
