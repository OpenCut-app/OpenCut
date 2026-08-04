use decode::{Frame, PixelFormat};

use crate::plan::{GpuError, RenderError};

pub fn to_linear_premultiplied(frame: &Frame) -> Result<Vec<u8>, RenderError> {
    let len = frame.width as usize * frame.height as usize * 4;
    let mut out = vec![0u8; len];

    match frame.format {
        PixelFormat::Rgba8 => rgba8_to_premul(&frame.pixels, &mut out),
        PixelFormat::Bgra8 => bgra8_to_premul(&frame.pixels, &mut out),
        PixelFormat::Rgb8 => rgb8_to_premul(&frame.pixels, &mut out),
    }

    Ok(out)
}

pub(crate) fn output_format_to_wgpu(format: crate::plan::OutputFormat) -> wgpu::TextureFormat {
    match format {
        crate::plan::OutputFormat::Rgba8Premultiplied => wgpu::TextureFormat::Rgba8Unorm,
        crate::plan::OutputFormat::Bgra8Premultiplied => wgpu::TextureFormat::Bgra8Unorm,
    }
}

#[cfg(any(test, feature = "wgpu-tests"))]
pub fn readback_rgba8(
    texture: &wgpu::Texture,
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    width: u32,
    height: u32,
) -> Result<Vec<u8>, RenderError> {
    let bytes_per_row = width * 4;
    let padded_bytes_per_row = align_to(bytes_per_row, 256);
    let buffer_size = padded_bytes_per_row as u64 * height as u64;

    let buffer = device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("readback"),
        size: buffer_size,
        usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
        mapped_at_creation: false,
    });

    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("readback_encoder"),
    });
    encoder.copy_texture_to_buffer(
        wgpu::TexelCopyTextureInfo {
            texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
        },
        wgpu::TexelCopyBufferInfo {
            buffer: &buffer,
            layout: wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(padded_bytes_per_row),
                rows_per_image: Some(height),
            },
        },
        wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
    );
    queue.submit(Some(encoder.finish()));

    let slice = buffer.slice(..);
    slice.map_async(wgpu::MapMode::Read, |_| {});
    device.poll(wgpu::PollType::Wait).map_err(map_poll_error)?;

    let data = slice.get_mapped_range();
    let mut pixels = vec![0u8; (width * height * 4) as usize];
    for row in 0..height as usize {
        let src_start = row * padded_bytes_per_row as usize;
        let dst_start = row * bytes_per_row as usize;
        pixels[dst_start..dst_start + bytes_per_row as usize]
            .copy_from_slice(&data[src_start..src_start + bytes_per_row as usize]);
    }
    drop(data);
    buffer.unmap();

    Ok(pixels)
}

fn rgba8_to_premul(src: &[u8], dst: &mut [u8]) {
    for (s, d) in src.chunks_exact(4).zip(dst.chunks_exact_mut(4)) {
        premul_pixel(s[0], s[1], s[2], s[3], d);
    }
}

fn bgra8_to_premul(src: &[u8], dst: &mut [u8]) {
    for (s, d) in src.chunks_exact(4).zip(dst.chunks_exact_mut(4)) {
        premul_pixel(s[2], s[1], s[0], s[3], d);
    }
}

fn rgb8_to_premul(src: &[u8], dst: &mut [u8]) {
    for (s, d) in src.chunks_exact(3).zip(dst.chunks_exact_mut(4)) {
        premul_pixel(s[0], s[1], s[2], 255, d);
    }
}

fn premul_pixel(r: u8, g: u8, b: u8, a: u8, dst: &mut [u8]) {
    let af = a as f32 / 255.0;
    dst[0] = (r as f32 * af).round() as u8;
    dst[1] = (g as f32 * af).round() as u8;
    dst[2] = (b as f32 * af).round() as u8;
    dst[3] = a;
}

fn align_to(value: u32, alignment: u32) -> u32 {
    ((value + alignment - 1) / alignment) * alignment
}

#[allow(dead_code)]
fn map_poll_error(_err: wgpu::PollError) -> RenderError {
    RenderError::Gpu(GpuError::Internal)
}
