precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_faceMaskEnabled;

varying vec2 v_texCoord;

void main() {
  // Pass-through — the actual face mask blending is done by the renderer
  // when face detection is available. Without a mask, the smoothing
  // applies uniformly (acceptable fallback).
  gl_FragColor = texture2D(u_texture, v_texCoord);
}
