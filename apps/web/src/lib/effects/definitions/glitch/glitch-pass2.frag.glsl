precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_time;

varying vec2 v_texCoord;

float random(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);

  // Scanlines
  float scanline = sin(v_texCoord.y * u_resolution.y * 1.5) * 0.5 + 0.5;
  color.rgb *= 1.0 - u_intensity * scanline * 0.15;

  // Random noise flicker
  float noise = random(v_texCoord + u_time) * u_intensity * 0.1;
  color.rgb += noise;

  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
}
