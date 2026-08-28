precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_temperature;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  // Warm = boost red, reduce blue. Cool = opposite.
  color.r += u_temperature;
  color.b -= u_temperature;
  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
}
