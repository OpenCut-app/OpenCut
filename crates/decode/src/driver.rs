use crate::{Frame, Source, SourceId, SourceStream, SourceStreamId};
use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum DecodeError {
    #[error("source not found")]
    SourceNotFound,
    #[error("stream not found")]
    StreamNotFound,
    #[error("unsupported format")]
    UnsupportedFormat,
    #[error("decoding failed: {0}")]
    DecodingFailed(String),
    #[error("end of stream")]
    EndOfStream,
}

pub trait Decoder {
    fn open(&mut self, source: &Source) -> Result<SourceId, DecodeError>;
    fn streams(&self, source: SourceId) -> Result<Vec<SourceStream>, DecodeError>;
    fn read_frame(
        &mut self,
        source: SourceId,
        stream: SourceStreamId,
        time: time::RationalTime,
    ) -> Result<Frame, DecodeError>;
    fn close(&mut self, source: SourceId) -> Result<(), DecodeError>;
}
