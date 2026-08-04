use std::sync::Arc;

use decode::{
    DecodeError, Decoder, FakeDecoder, FakeDecoderConfig, PixelFormat, Source, SourceId,
    SourceStreamId,
};
use render::{
    Affine, Blend, Crop, Node, NodeId, Opacity, Output, OutputFormat, RenderError, RenderPlan,
    Renderer, SourceRef,
};
use time::{FrameRate, RationalTime};

fn test_decoder(color: [u8; 4]) -> FakeDecoder {
    FakeDecoder::new(FakeDecoderConfig {
        frame_rate: FrameRate::new(30, 1).unwrap(),
        width: 4,
        height: 4,
        duration: RationalTime::new(10, 1).unwrap(),
        format: PixelFormat::Rgba8,
        color,
    })
}

fn test_output() -> Output {
    Output {
        width: 4,
        height: 4,
        format: OutputFormat::Rgba8Premultiplied,
    }
}

fn scale_to_output_affine(crop_w: u32, crop_h: u32, out_w: u32, out_h: u32) -> Affine {
    Affine {
        m: [
            out_w as f32 / crop_w as f32,
            0.0,
            0.0,
            out_h as f32 / crop_h as f32,
            0.0,
            0.0,
        ],
    }
}

struct HeadlessGpu {
    device: wgpu::Device,
    queue: wgpu::Queue,
}

fn headless_gpu() -> HeadlessGpu {
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
        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor {
                label: Some("test_device"),
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::downlevel_defaults(),
                memory_hints: wgpu::MemoryHints::Performance,
                trace: wgpu::Trace::Off,
            })
            .await
            .expect("device");
        HeadlessGpu { device, queue }
    })
}

fn node(id: u64, source: SourceId, stream: SourceStreamId, color_time: RationalTime) -> Node {
    Node {
        id: NodeId::new(id),
        source: SourceRef {
            source,
            stream,
            time: color_time,
        },
        crop: Crop {
            x: 0,
            y: 0,
            w: 4,
            h: 4,
        },
        transform: scale_to_output_affine(4, 4, 4, 4),
        opacity: Opacity::new(1.0).unwrap(),
        blend: Blend::SourceOver,
    }
}

#[test]
fn unregistered_source_fails_unknown_source() {
    let gpu = headless_gpu();
    let mut decoder = test_decoder([255, 0, 0, 255]);
    let mut renderer = Renderer::new(&mut decoder, &gpu.device, &gpu.queue);

    let plan = RenderPlan {
        output: test_output(),
        nodes: vec![Node {
            id: NodeId::new(1),
            source: SourceRef {
                source: SourceId::new(99),
                stream: SourceStreamId::new(1),
                time: RationalTime::new(0, 1).unwrap(),
            },
            crop: Crop {
                x: 0,
                y: 0,
                w: 4,
                h: 4,
            },
            transform: scale_to_output_affine(4, 4, 4, 4),
            opacity: Opacity::new(1.0).unwrap(),
            blend: Blend::SourceOver,
        }],
    };

    assert!(matches!(
        renderer.render(&plan),
        Err(RenderError::UnknownSource)
    ));
}

#[test]
fn registered_source_resolves_with_floored_frame_time() {
    let gpu = headless_gpu();
    let mut decoder = test_decoder([255, 0, 0, 255]);
    let mut renderer = Renderer::new(&mut decoder, &gpu.device, &gpu.queue);
    let source = renderer
        .register_source(&Source::Bytes(Arc::from([0u8; 0])))
        .unwrap();
    let stream = SourceStreamId::new(1);

    let requested = RationalTime::new(1, 30).unwrap();
    let plan = RenderPlan {
        output: test_output(),
        nodes: vec![node(1, source, stream, requested)],
    };

    renderer.render(&plan).unwrap();
    drop(renderer);

    let frame = decoder.read_frame(source, stream, requested).unwrap();
    assert_eq!(frame.time, RationalTime::new(1, 30).unwrap());
}

#[test]
fn release_source_invalidates_cache_and_fails_unknown_source() {
    let gpu = headless_gpu();
    let mut decoder = test_decoder([255, 0, 0, 255]);
    let mut renderer = Renderer::new(&mut decoder, &gpu.device, &gpu.queue);
    let source = renderer
        .register_source(&Source::Bytes(Arc::from([0u8; 0])))
        .unwrap();
    let stream = SourceStreamId::new(1);

    let plan = RenderPlan {
        output: test_output(),
        nodes: vec![node(1, source, stream, RationalTime::new(0, 1).unwrap())],
    };
    renderer.render(&plan).unwrap();
    renderer.release_source(source).unwrap();

    assert!(matches!(
        renderer.render(&plan),
        Err(RenderError::UnknownSource)
    ));
}

#[test]
fn end_of_stream_propagates_as_decode_error() {
    let gpu = headless_gpu();
    let mut decoder = FakeDecoder::new(FakeDecoderConfig {
        frame_rate: FrameRate::new(30, 1).unwrap(),
        width: 4,
        height: 4,
        duration: RationalTime::new(1, 30).unwrap(),
        format: PixelFormat::Rgba8,
        color: [255, 0, 0, 255],
    });
    let mut renderer = Renderer::new(&mut decoder, &gpu.device, &gpu.queue);
    let source = renderer
        .register_source(&Source::Bytes(Arc::from([0u8; 0])))
        .unwrap();
    let stream = SourceStreamId::new(1);

    let plan = RenderPlan {
        output: test_output(),
        nodes: vec![node(
            1,
            source,
            stream,
            RationalTime::new(1, 1).unwrap(),
        )],
    };

    assert!(matches!(
        renderer.render(&plan),
        Err(RenderError::Decode(DecodeError::EndOfStream))
    ));
}
