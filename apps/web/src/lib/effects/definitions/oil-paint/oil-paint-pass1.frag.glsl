precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_levels;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  // Quantize colors to discrete levels
  color.rgb = floor(color.rgb * u_levels + 0.5) / u_levels;
  gl_FragColor = color;
}
