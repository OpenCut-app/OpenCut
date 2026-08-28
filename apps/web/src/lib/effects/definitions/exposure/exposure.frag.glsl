precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_exposure;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  // Photographic exposure: multiply by 2^stops
  color.rgb *= pow(2.0, u_exposure);
  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
}
