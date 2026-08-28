precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform vec2 u_jawCenter;

varying vec2 v_texCoord;

void main() {
  vec2 uv = v_texCoord;

  // Simple pinch warp toward center along jawline
  vec2 toCenter = u_jawCenter - uv;
  float dist = length(toCenter);
  float radius = 0.3;

  if (dist < radius) {
    float falloff = 1.0 - smoothstep(0.0, radius, dist);
    // Pull pixels inward (toward jaw center) for slimming
    uv += toCenter * falloff * u_intensity * 0.05;
  }

  gl_FragColor = texture2D(u_texture, uv);
}
