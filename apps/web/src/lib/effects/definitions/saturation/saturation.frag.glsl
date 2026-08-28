precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_saturation;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  // BT.709 luminance coefficients
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  color.rgb = mix(vec3(luma), color.rgb, u_saturation);
  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
}
