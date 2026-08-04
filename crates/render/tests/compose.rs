#![cfg(feature = "wgpu-tests")]

use std::sync::Arc;

use decode::{
    FakeDecoder, FakeDecoderConfig, PixelFormat, Source, SourceStreamId,
};
use render::pixels::readback_rgba8;
use render::{
    Affine, Blend, Crop, Node, NodeId, Opacity, Output, OutputFormat, RenderPlan, Renderer,
    SourceRef,
};
use time::{FrameRate, RationalTime};

fn headless_gpu() -> (wgpu::Device, wgpu::Queue) {
    pollster::block_on(async {
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: wgpu::Backends::VULKAN | wgpu::Backends::GL,
            ..Default::default()
        });
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::LowPower,
                force_fallback_adapter: true,
                compatible_surface: None,
            })
            .await
            .expect("adapter");
        adapter
            .request_device(&wgpu::DeviceDescriptor {
                label: Some("compose_test_device"),
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::downlevel_defaults(),
                memory_hints: wgpu::MemoryHints::Performance,
                trace: wgpu::Trace::Off,
            })
            .await
            .expect("device")
    })
}

fn output_8x8() -> Output {
    Output {
        width: 8,
        height: 8,
        format: OutputFormat::Rgba8Premultiplied,
    }
}

fn fill_affine(src_w: u32, src_h: u32, out_w: u32, out_h: u32) -> Affine {
    Affine {
        m: [
            out_w as f32 / src_w as f32,
            0.0,
            0.0,
            out_h as f32 / src_h as f32,
            0.0,
            0.0,
        ],
    }
}

fn decoder_with_color(color: [u8; 4], size: u32) -> FakeDecoder {
    FakeDecoder::new(FakeDecoderConfig {
        frame_rate: FrameRate::new(30, 1).unwrap(),
        width: size,
        height: size,
        duration: RationalTime::new(10, 1).unwrap(),
        format: PixelFormat::Rgba8,
        color,
    })
}

fn center_pixel(pixels: &[u8], width: u32, height: u32) -> [u8; 4] {
    let x = width / 2;
    let y = height / 2;
    let idx = ((y * width + x) * 4) as usize;
    [
        pixels[idx],
        pixels[idx + 1],
        pixels[idx + 2],
        pixels[idx + 3],
    ]
}

#[test]
#[ignore = "requires GPU; run with --features wgpu-tests -- --ignored"]
fn single_opaque_node_fills_output_with_source_color() {
    let (device, queue) = headless_gpu();
    let mut decoder = decoder_with_color([200, 40, 60, 255], 8);
    let mut renderer = Renderer::new(&mut decoder, &device, &queue);
    let source = renderer
        .register_source(&Source::Bytes(Arc::from([0u8; 0])))
        .unwrap();
    let stream = decoder.streams(source).unwrap()[0].id;

    let plan = RenderPlan {
        output: output_8x8(),
        nodes: vec![Node {
            id: NodeId::new(1),
            source: SourceRef {
                source,
                stream,
                time: RationalTime::new(0, 1).unwrap(),
            },
            crop: Crop {
                x: 0,
                y: 0,
                w: 8,
                h: 8,
            },
            transform: fill_affine(8, 8, 8, 8),
            opacity: Opacity::new(1.0).unwrap(),
            blend: Blend::SourceOver,
        }],
    };

    let out = renderer.render(&plan).unwrap();
    let pixels = readback_rgba8(&out.texture, &device, &queue, 8, 8).unwrap();
    let px = center_pixel(&pixels, 8, 8);
    assert_eq!(px, [200, 40, 60, 255]);
}

#[test]
#[ignore = "requires GPU; run with --features wgpu-tests -- --ignored"]
fn two_stacked_nodes_blend_with_half_opacity() {
    let (device, queue) = headless_gpu();
    let mut bottom = decoder_with_color([100, 0, 0, 255], 8);
    let mut top = decoder_with_color([0, 0, 200, 255], 8);

    struct TwoDecoder {
        bottom: FakeDecoder,
        top: FakeDecoder,
        mapping: std::collections::HashMap<u64, bool>,
    }

    impl decode::Decoder for TwoDecoder {
        fn open(&mut self, source: &Source) -> Result<decode::SourceId, decode::DecodeError> {
            if self.mapping.is_empty() {
                let id = self.bottom.open(source)?;
                self.mapping.insert(id.raw(), false);
                Ok(id)
            } else {
                let id = self.top.open(source)?;
                self.mapping.insert(id.raw(), true);
                Ok(id)
            }
        }

        fn streams(
            &self,
            source: decode::SourceId,
        ) -> Result<Vec<decode::SourceStream>, decode::DecodeError> {
            if *self.mapping.get(&source.raw()).unwrap_or(&false) {
                self.top.streams(source)
            } else {
                self.bottom.streams(source)
            }
        }

        fn read_frame(
            &mut self,
            source: decode::SourceId,
            stream: decode::SourceStreamId,
            time: time::RationalTime,
        ) -> Result<decode::Frame, decode::DecodeError> {
            if *self.mapping.get(&source.raw()).unwrap_or(&false) {
                self.top.read_frame(source, stream, time)
            } else {
                self.bottom.read_frame(source, stream, time)
            }
        }

        fn close(&mut self, source: decode::SourceId) -> Result<(), decode::DecodeError> {
            if *self.mapping.get(&source.raw()).unwrap_or(&false) {
                self.top.close(source)
            } else {
                self.bottom.close(source)
            }
        }
    }

    let mut decoder = TwoDecoder {
        bottom,
        top,
        mapping: std::collections::HashMap::new(),
    };
    let mut renderer = Renderer::new(&mut decoder, &device, &queue);
    let bottom_source = renderer
        .register_source(&Source::Bytes(Arc::from([1u8; 0])))
        .unwrap();
    let top_source = renderer
        .register_source(&Source::Bytes(Arc::from([2u8; 0])))
        .unwrap();
    let bottom_stream = decoder.streams(bottom_source).unwrap()[0].id;
    let top_stream = decoder.streams(top_source).unwrap()[0].id;

    let plan = RenderPlan {
        output: output_8x8(),
        nodes: vec![
            Node {
                id: NodeId::new(1),
                source: SourceRef {
                    source: bottom_source,
                    stream: bottom_stream,
                    time: RationalTime::new(0, 1).unwrap(),
                },
                crop: Crop {
                    x: 0,
                    y: 0,
                    w: 8,
                    h: 8,
                },
                transform: fill_affine(8, 8, 8, 8),
                opacity: Opacity::new(1.0).unwrap(),
                blend: Blend::SourceOver,
            },
            Node {
                id: NodeId::new(2),
                source: SourceRef {
                    source: top_source,
                    stream: top_stream,
                    time: RationalTime::new(0, 1).unwrap(),
                },
                crop: Crop {
                    x: 0,
                    y: 0,
                    w: 8,
                    h: 8,
                },
                transform: fill_affine(8, 8, 8, 8),
                opacity: Opacity::new(0.5).unwrap(),
                blend: Blend::SourceOver,
            },
        ],
    };

    let out = renderer.render(&plan).unwrap();
    let pixels = readback_rgba8(&out.texture, &device, &queue, 8, 8).unwrap();
    let px = center_pixel(&pixels, 8, 8);

    // premul source-over: top(0,0,200,255)*0.5 over bottom(100,0,0,255)
    assert_eq!(px[0], 50);
    assert_eq!(px[2], 100);
    assert_eq!(px[3], 255);
}

#[test]
#[ignore = "requires GPU; run with --features wgpu-tests -- --ignored"]
fn cropped_node_renders_only_cropped_region() {
    let (device, queue) = headless_gpu();
    let mut decoder = decoder_with_color([0, 180, 0, 255], 8);
    let mut renderer = Renderer::new(&mut decoder, &device, &queue);
    let source = renderer
        .register_source(&Source::Bytes(Arc::from([0u8; 0])))
        .unwrap();
    let stream = decoder.streams(source).unwrap()[0].id;

    let plan = RenderPlan {
        output: output_8x8(),
        nodes: vec![Node {
            id: NodeId::new(1),
            source: SourceRef {
                source,
                stream,
                time: RationalTime::new(0, 1).unwrap(),
            },
            crop: Crop {
                x: 4,
                y: 4,
                w: 4,
                h: 4,
            },
            transform: fill_affine(4, 4, 8, 8),
            opacity: Opacity::new(1.0).unwrap(),
            blend: Blend::SourceOver,
        }],
    };

    let out = renderer.render(&plan).unwrap();
    let pixels = readback_rgba8(&out.texture, &device, &queue, 8, 8).unwrap();

    let corner = pixels[0..4].try_into().unwrap();
    let center = center_pixel(&pixels, 8, 8);
    assert_eq!(corner, [0, 0, 0, 0]);
    assert_eq!(center, [0, 180, 0, 255]);
}

#[test]
#[ignore = "requires GPU; run with --features wgpu-tests -- --ignored"]
fn affine_transform_maps_source_to_expected_output_rectangle() {
    let (device, queue) = headless_gpu();
    let mut decoder = decoder_with_color([10, 20, 30, 255], 8);
    let mut renderer = Renderer::new(&mut decoder, &device, &queue);
    let source = renderer
        .register_source(&Source::Bytes(Arc::from([0u8; 0])))
        .unwrap();
    let stream = decoder.streams(source).unwrap()[0].id;

    let plan = RenderPlan {
        output: output_8x8(),
        nodes: vec![Node {
            id: NodeId::new(1),
            source: SourceRef {
                source,
                stream,
                time: RationalTime::new(0, 1).unwrap(),
            },
            crop: Crop {
                x: 0,
                y: 0,
                w: 8,
                h: 8,
            },
            transform: Affine {
                m: [0.5, 0.0, 0.0, 0.5, 2.0, 2.0],
            },
            opacity: Opacity::new(1.0).unwrap(),
            blend: Blend::SourceOver,
        }],
    };

    let out = renderer.render(&plan).unwrap();
    let pixels = readback_rgba8(&out.texture, &device, &queue, 8, 8).unwrap();

    let inside = center_pixel(&pixels, 8, 8);
    let outside_idx = (0 * 8 + 0) * 4;
    assert_eq!(inside, [10, 20, 30, 255]);
    assert_eq!(pixels[outside_idx..outside_idx + 4], [0, 0, 0, 0]);
}
