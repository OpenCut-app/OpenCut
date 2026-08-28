precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_grainSize;
uniform float u_time;

varying vec2 v_texCoord;

// Hash-based pseudo-random noise
float random(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  // Quantize UV by grain size for blocky noise
  vec2 grainCoord = floor(v_texCoord * u_resolution / u_grainSize) * u_grainSize;
  float noise = random(grainCoord + u_time) * 2.0 - 1.0;
  color.rgb += noise * u_intensity;
  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
}
