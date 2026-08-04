use crate::plan::{Affine, Blend, Crop, GpuError, Opacity, Output, OutputFormat, OutputTexture, RenderError};
use crate::pixels::output_format_to_wgpu;

#[derive(Debug, Clone)]
pub struct Layer {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u8>,
    pub crop: Crop,
    pub transform: Affine,
    pub opacity: Opacity,
    pub blend: Blend,
}

#[derive(Default)]
pub struct Composer;

impl Composer {
    pub fn new() -> Self {
        Self
    }

    pub fn compose(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        output: &Output,
        layers: &[Layer],
    ) -> Result<OutputTexture, RenderError> {
        let mut buffer = vec![0u8; output_pixel_len(output)];

        for layer in layers {
            composite_layer(&mut buffer, output, layer);
        }

        reorder_for_output_format(&mut buffer, output.format);

        let texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("render_output"),
            size: wgpu::Extent3d {
                width: output.width,
                height: output.height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: output_format_to_wgpu(output.format),
            usage: wgpu::TextureUsages::COPY_SRC
                | wgpu::TextureUsages::TEXTURE_BINDING
                | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });

        queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &buffer,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(output.width * 4),
                rows_per_image: Some(output.height),
            },
            wgpu::Extent3d {
                width: output.width,
                height: output.height,
                depth_or_array_layers: 1,
            },
        );

        Ok(OutputTexture {
            texture,
            output: *output,
        })
    }
}

fn output_pixel_len(output: &Output) -> usize {
    output.width as usize * output.height as usize * 4
}

fn reorder_for_output_format(buffer: &mut [u8], format: OutputFormat) {
    if matches!(format, OutputFormat::Rgba8Premultiplied) {
        return;
    }
    for px in buffer.chunks_exact_mut(4) {
        px.swap(0, 2);
    }
}

fn composite_layer(dst: &mut [u8], output: &Output, layer: &Layer) {
    let out_w = output.width as i32;
    let out_h = output.height as i32;
    let inv = match invert_affine(layer.transform) {
        Ok(v) => v,
        Err(()) => return,
    };

    for oy in 0..out_h {
        for ox in 0..out_w {
            let (sx, sy) = apply_affine(inv, ox as f32, oy as f32);
            if sx < layer.crop.x as f32
                || sy < layer.crop.y as f32
                || sx >= (layer.crop.x + layer.crop.w) as f32
                || sy >= (layer.crop.y + layer.crop.h) as f32
            {
                continue;
            }

            let src_x = sx.floor() as u32;
            let src_y = sy.floor() as u32;
            if src_x >= layer.width || src_y >= layer.height {
                continue;
            }

            let src = sample_premul(&layer.pixels, layer.width, src_x, src_y);
            let src = scale_premul(src, layer.opacity.value());

            let dst_idx = ((oy * out_w + ox) * 4) as usize;
            let dst_px = [
                dst[dst_idx],
                dst[dst_idx + 1],
                dst[dst_idx + 2],
                dst[dst_idx + 3],
            ];

            let out = match layer.blend {
                Blend::SourceOver => source_over_premul(dst_px, src),
            };

            dst[dst_idx..dst_idx + 4].copy_from_slice(&out);
        }
    }
}

fn apply_affine(affine: Affine, x: f32, y: f32) -> (f32, f32) {
    let [a, b, c, d, e, f] = affine.m;
    (a * x + c * y + e, b * x + d * y + f)
}

fn invert_affine(affine: Affine) -> Result<Affine, ()> {
    let [a, b, c, d, e, f] = affine.m;
    let det = a * d - b * c;
    if det.abs() < f32::EPSILON {
        return Err(());
    }
    let inv_det = 1.0 / det;
    let ia = d * inv_det;
    let ib = -b * inv_det;
    let ic = -c * inv_det;
    let id = a * inv_det;
    let ie = -(ia * e + ic * f);
    let iff = -(ib * e + id * f);
    Ok(Affine {
        m: [ia, ib, ic, id, ie, iff],
    })
}

fn sample_premul(pixels: &[u8], width: u32, x: u32, y: u32) -> [u8; 4] {
    let idx = ((y * width + x) * 4) as usize;
    [
        pixels[idx],
        pixels[idx + 1],
        pixels[idx + 2],
        pixels[idx + 3],
    ]
}

fn scale_premul(px: [u8; 4], opacity: f32) -> [u8; 4] {
    [
        (px[0] as f32 * opacity).round() as u8,
        (px[1] as f32 * opacity).round() as u8,
        (px[2] as f32 * opacity).round() as u8,
        (px[3] as f32 * opacity).round() as u8,
    ]
}

fn source_over_premul(dst: [u8; 4], src: [u8; 4]) -> [u8; 4] {
    let src_a = src[3] as f32 / 255.0;
    let inv = 1.0 - src_a;
    [
        (src[0] as f32 + dst[0] as f32 * inv).round() as u8,
        (src[1] as f32 + dst[1] as f32 * inv).round() as u8,
        (src[2] as f32 + dst[2] as f32 * inv).round() as u8,
        (src[3] as f32 + dst[3] as f32 * inv).round().min(255.0) as u8,
    ]
}

#[allow(dead_code)]
fn map_wgpu_err(_: wgpu::Error) -> RenderError {
    RenderError::Gpu(GpuError::Internal)
}
