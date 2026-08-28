precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform vec3 u_color;
uniform vec2 u_cheekLeft;
uniform vec2 u_cheekRight;
uniform float u_cheekRadius;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);

  // Soft circle blend at cheek positions
  float distL = distance(v_texCoord, u_cheekLeft);
  float distR = distance(v_texCoord, u_cheekRight);
  float maskL = 1.0 - smoothstep(u_cheekRadius * 0.6, u_cheekRadius, distL);
  float maskR = 1.0 - smoothstep(u_cheekRadius * 0.6, u_cheekRadius, distR);
  float mask = max(maskL, maskR) * u_intensity;

  // Soft light blend with blush color
  color.rgb = mix(color.rgb, color.rgb * u_color + u_color * 0.2, mask);
  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
}
