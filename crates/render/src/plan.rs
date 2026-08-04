use decode::{SourceId, SourceStreamId};
use time::RationalTime;

/// An immutable, fully-resolved description of one composition.
#[derive(Clone, Debug, PartialEq)]
pub struct RenderPlan {
    pub output: Output,
    pub nodes: Vec<Node>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Output {
    pub width: u32,
    pub height: u32,
    pub format: OutputFormat,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OutputFormat {
    Rgba8Premultiplied,
    Bgra8Premultiplied,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Node {
    pub id: NodeId,
    pub source: SourceRef,
    pub crop: Crop,
    pub transform: Affine,
    pub opacity: Opacity,
    pub blend: Blend,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct NodeId(u64);

impl NodeId {
    pub fn new(id: u64) -> Self {
        Self(id)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SourceRef {
    pub source: SourceId,
    pub stream: SourceStreamId,
    pub time: RationalTime,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Crop {
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Affine {
    pub m: [f32; 6],
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Opacity(f32);

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum OpacityError {
    OutOfRange(f32),
}

impl Opacity {
    pub fn new(value: f32) -> Result<Self, OpacityError> {
        if !(0.0..=1.0).contains(&value) || !value.is_finite() {
            Err(OpacityError::OutOfRange(value))
        } else {
            Ok(Self(value))
        }
    }

    pub fn value(self) -> f32 {
        self.0
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Blend {
    SourceOver,
}

#[derive(Debug, PartialEq)]
pub enum RenderError {
    InvalidPlan(PlanError),
    UnknownSource,
    UnknownStream,
    UnsupportedPixelFormat,
    Decode(decode::DecodeError),
    Gpu(GpuError),
}

#[derive(Debug, PartialEq, Eq)]
pub enum PlanError {
    DanglingSourceRef,
    DuplicateNodeId,
    DimensionZero,
    OutOfRangeCrop,
    InvalidAffine,
}

#[derive(Debug, PartialEq, Eq)]
pub enum GpuError {
    OutOfMemory,
    Validation,
    Internal,
}

pub struct OutputTexture {
    pub texture: wgpu::Texture,
    pub output: Output,
}
