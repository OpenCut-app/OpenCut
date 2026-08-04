use std::collections::HashMap;

use crate::{
    DecodeError, Decoder, Frame, PixelFormat, Source, SourceId, SourceStream, SourceStreamId,
};
use time::{FrameRate, RationalTime};

/// Configuration applied to each source opened by [`FakeDecoder`].
#[derive(Clone, Debug)]
pub struct FakeDecoderConfig {
    pub frame_rate: FrameRate,
    pub width: u32,
    pub height: u32,
    pub duration: RationalTime,
    pub format: PixelFormat,
    pub color: [u8; 4],
}

impl Default for FakeDecoderConfig {
    fn default() -> Self {
        Self {
            frame_rate: FrameRate::new(30, 1).expect("valid default frame rate"),
            width: 64,
            height: 64,
            duration: RationalTime::new(1, 1).expect("valid default duration"),
            format: PixelFormat::Rgba8,
            color: [255, 0, 0, 255],
        }
    }
}

struct OpenSource {
    stream: SourceStream,
    config: FakeDecoderConfig,
}

pub struct FakeDecoder {
    next_id: u64,
    default_config: FakeDecoderConfig,
    sources: HashMap<u64, OpenSource>,
}

impl FakeDecoder {
    pub fn new(config: FakeDecoderConfig) -> Self {
        Self {
            next_id: 1,
            default_config: config,
            sources: HashMap::new(),
        }
    }

    fn lookup(&self, source: SourceId) -> Result<&OpenSource, DecodeError> {
        self.sources
            .get(&source.raw())
            .ok_or(DecodeError::SourceNotFound)
    }

    fn lookup_mut(&mut self, source: SourceId) -> Result<&mut OpenSource, DecodeError> {
        self.sources
            .get_mut(&source.raw())
            .ok_or(DecodeError::SourceNotFound)
    }
}

impl Decoder for FakeDecoder {
    fn open(&mut self, _source: &Source) -> Result<SourceId, DecodeError> {
        let id = SourceId::new(self.next_id);
        self.next_id += 1;

        let config = self.default_config.clone();
        let stream = SourceStream {
            id: SourceStreamId::new(1),
            frame_rate: config.frame_rate,
            width: config.width,
            height: config.height,
            duration: config.duration,
        };

        self.sources.insert(
            id.raw(),
            OpenSource {
                stream,
                config,
            },
        );

        Ok(id)
    }

    fn streams(&self, source: SourceId) -> Result<Vec<SourceStream>, DecodeError> {
        Ok(vec![self.lookup(source)?.stream.clone()])
    }

    fn read_frame(
        &mut self,
        source: SourceId,
        stream: SourceStreamId,
        time: RationalTime,
    ) -> Result<Frame, DecodeError> {
        let open = self.lookup_mut(source)?;
        if open.stream.id != stream {
            return Err(DecodeError::StreamNotFound);
        }

        if !time.lt(&open.stream.duration) {
            return Err(DecodeError::EndOfStream);
        }

        let frame_index = open
            .stream
            .frame_rate
            .frame_index_floor(time)
            .map_err(|_| DecodeError::DecodingFailed("frame index overflow".into()))?;
        let frame_time = open
            .stream
            .frame_rate
            .frame_start(frame_index)
            .map_err(|_| DecodeError::DecodingFailed("frame time overflow".into()))?;

        let len = Frame::expected_byte_len(open.stream.width, open.stream.height, open.config.format);
        let mut pixels = vec![0u8; len].into_boxed_slice();
        fill_solid(&mut pixels, open.config.format, open.config.color);

        Ok(Frame {
            source,
            stream,
            time: frame_time,
            width: open.stream.width,
            height: open.stream.height,
            format: open.config.format,
            pixels,
        })
    }

    fn close(&mut self, source: SourceId) -> Result<(), DecodeError> {
        self.sources
            .remove(&source.raw())
            .map(|_| ())
            .ok_or(DecodeError::SourceNotFound)
    }
}

fn fill_solid(pixels: &mut [u8], format: PixelFormat, color: [u8; 4]) {
    let (r, g, b, a) = (color[0], color[1], color[2], color[3]);
    match format {
        PixelFormat::Rgba8 => {
            for chunk in pixels.chunks_exact_mut(4) {
                chunk.copy_from_slice(&[r, g, b, a]);
            }
        }
        PixelFormat::Bgra8 => {
            for chunk in pixels.chunks_exact_mut(4) {
                chunk.copy_from_slice(&[b, g, r, a]);
            }
        }
        PixelFormat::Rgb8 => {
            for chunk in pixels.chunks_exact_mut(3) {
                chunk.copy_from_slice(&[r, g, b]);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    fn decoder() -> FakeDecoder {
        FakeDecoder::new(FakeDecoderConfig {
            frame_rate: FrameRate::new(30, 1).unwrap(),
            width: 4,
            height: 4,
            duration: RationalTime::new(1, 1).unwrap(),
            format: PixelFormat::Rgba8,
            color: [10, 20, 30, 255],
        })
    }

    #[test]
    fn read_frame_time_is_floor_of_requested_time() {
        let mut decoder = decoder();
        let source = decoder
            .open(&Source::Bytes(Arc::from([0u8; 0])))
            .unwrap();
        let stream = decoder.streams(source).unwrap()[0].id;
        let requested = RationalTime::new(1, 30).unwrap();
        let frame = decoder.read_frame(source, stream, requested).unwrap();
        assert_eq!(frame.time, RationalTime::new(1, 30).unwrap());
    }

    #[test]
    fn streams_report_declared_metadata() {
        let mut decoder = decoder();
        let source = decoder
            .open(&Source::Bytes(Arc::from([0u8; 0])))
            .unwrap();
        let streams = decoder.streams(source).unwrap();
        assert_eq!(streams.len(), 1);
        assert_eq!(streams[0].width, 4);
        assert_eq!(streams[0].height, 4);
        assert_eq!(streams[0].frame_rate, FrameRate::new(30, 1).unwrap());
        assert_eq!(streams[0].duration, RationalTime::new(1, 1).unwrap());
    }

    #[test]
    fn unknown_source_errors() {
        let mut decoder = decoder();
        let missing = SourceId::new(999);
        assert_eq!(decoder.streams(missing), Err(DecodeError::SourceNotFound));
        assert_eq!(
            decoder.read_frame(missing, SourceStreamId::new(1), RationalTime::new(0, 1).unwrap()),
            Err(DecodeError::SourceNotFound)
        );
    }

    #[test]
    fn unknown_stream_errors() {
        let mut decoder = decoder();
        let source = decoder
            .open(&Source::Bytes(Arc::from([0u8; 0])))
            .unwrap();
        assert_eq!(
            decoder.read_frame(
                source,
                SourceStreamId::new(99),
                RationalTime::new(0, 1).unwrap()
            ),
            Err(DecodeError::StreamNotFound)
        );
    }

    #[test]
    fn read_frame_after_close_errors() {
        let mut decoder = decoder();
        let source = decoder
            .open(&Source::Bytes(Arc::from([0u8; 0])))
            .unwrap();
        let stream = decoder.streams(source).unwrap()[0].id;
        decoder.close(source).unwrap();
        assert_eq!(
            decoder.read_frame(source, stream, RationalTime::new(0, 1).unwrap()),
            Err(DecodeError::SourceNotFound)
        );
    }

    #[test]
    fn read_frame_at_or_past_duration_errors() {
        let mut decoder = decoder();
        let source = decoder
            .open(&Source::Bytes(Arc::from([0u8; 0])))
            .unwrap();
        let stream = decoder.streams(source).unwrap()[0].id;
        let duration = RationalTime::new(1, 1).unwrap();
        assert_eq!(
            decoder.read_frame(source, stream, duration),
            Err(DecodeError::EndOfStream)
        );
    }
}
