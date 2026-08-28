precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_threshold;

varying vec2 v_texCoord;

void main() {
  vec4 edges = texture2D(u_texture, v_texCoord);
  float edge = edges.r;
  // Threshold and invert for sketch look (dark lines on white)
  float line = step(u_threshold, edge);
  gl_FragColor = vec4(vec3(1.0 - line), 1.0);
}
