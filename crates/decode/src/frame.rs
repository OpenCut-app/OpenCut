use crate::{SourceId, SourceStreamId};

/// Pixel layout the decoder can hand to the renderer.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PixelFormat {
    Rgba8,
    Bgra8,
    Rgb8,
}

/// A decoded video frame.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Frame {
    pub source: SourceId,
    pub stream: SourceStreamId,
    pub time: time::RationalTime,
    pub width: u32,
    pub height: u32,
    pub format: PixelFormat,
    pub pixels: Box<[u8]>,
}

impl Frame {
    pub fn expected_byte_len(width: u32, height: u32, format: PixelFormat) -> usize {
        let bpp = match format {
            PixelFormat::Rgba8 | PixelFormat::Bgra8 => 4,
            PixelFormat::Rgb8 => 3,
        };
        width as usize * height as usize * bpp
    }
}
