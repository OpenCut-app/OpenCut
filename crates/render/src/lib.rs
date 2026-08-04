//! Product-neutral visual rendering against wgpu.

mod compose;
mod pixels;
mod plan;
mod source;
mod validate;

pub use plan::{
    Affine, Blend, Crop, GpuError, Node, NodeId, Opacity, OpacityError, Output, OutputFormat,
    OutputTexture, PlanError, RenderError, RenderPlan, SourceRef,
};
pub use validate::validate_plan;

use compose::Composer;
use decode::{DecodeError, Decoder, Source, SourceId};
use source::{FrameCache, SourceRegistry};

/// Offscreen renderer: validates plans, resolves frames through a decoder, composes into textures.
pub struct Renderer<'a> {
    decoder: &'a mut dyn Decoder,
    device: &'a wgpu::Device,
    queue: &'a wgpu::Queue,
    registry: SourceRegistry,
    cache: FrameCache,
    composer: Composer,
}

impl<'a> Renderer<'a> {
    pub fn new(
        decoder: &'a mut dyn Decoder,
        device: &'a wgpu::Device,
        queue: &'a wgpu::Queue,
    ) -> Self {
        Self {
            decoder,
            device,
            queue,
            registry: SourceRegistry::new(),
            cache: FrameCache::new(),
            composer: Composer::new(),
        }
    }

    pub fn register_source(&mut self, source: &Source) -> Result<SourceId, RenderError> {
        let id = self.decoder.open(source).map_err(RenderError::Decode)?;
        let streams = self
            .decoder
            .streams(id)
            .map_err(RenderError::Decode)?;
        self.registry.insert(id, streams);
        Ok(id)
    }

    pub fn release_source(&mut self, source: SourceId) -> Result<(), RenderError> {
        self.cache.flush_source(source);
        self.registry.remove(source);
        self.decoder.close(source).map_err(RenderError::Decode)
    }

    pub fn render(&mut self, plan: &RenderPlan) -> Result<OutputTexture, RenderError> {
        validate::validate_for_render(plan, &self.registry)?;

        let mut layers = Vec::with_capacity(plan.nodes.len());
        for node in &plan.nodes {
            if !self.registry.contains(node.source.source) {
                return Err(RenderError::UnknownSource);
            }

            let streams = self
                .registry
                .streams(node.source.source)
                .ok_or(RenderError::UnknownSource)?;
            let stream = streams
                .iter()
                .find(|s| s.id == node.source.stream)
                .cloned()
                .ok_or(RenderError::UnknownStream)?;

            let frame = self.resolve_frame(node, &stream)?;
            let premul = pixels::to_linear_premultiplied(&frame)?;
            layers.push(compose::Layer {
                width: frame.width,
                height: frame.height,
                pixels: premul,
                crop: node.crop,
                transform: node.transform,
                opacity: node.opacity,
                blend: node.blend,
            });
        }

        self.composer.compose(
            self.device,
            self.queue,
            &plan.output,
            &layers,
        )
    }

    fn resolve_frame(
        &mut self,
        node: &Node,
        stream: &decode::SourceStream,
    ) -> Result<decode::Frame, RenderError> {
        let cache_key_time = stream
            .frame_rate
            .frame_index_floor(node.source.time)
            .map_err(|_| RenderError::Decode(DecodeError::DecodingFailed("time overflow".into())))?;
        let cache_key = stream
            .frame_rate
            .frame_start(cache_key_time)
            .map_err(|_| RenderError::Decode(DecodeError::DecodingFailed("time overflow".into())))?;

        if let Some(frame) = self.cache.get(node.source.source, node.source.stream, cache_key) {
            return Ok(frame.clone());
        }

        let frame = self
            .decoder
            .read_frame(node.source.source, node.source.stream, node.source.time)
            .map_err(RenderError::Decode)?;

        self.cache.insert(
            node.source.source,
            node.source.stream,
            cache_key,
            frame.clone(),
        );
        Ok(frame)
    }
}
