precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_threshold;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  // Extract only bright areas above threshold
  float mask = smoothstep(u_threshold, u_threshold + 0.1, luma);
  gl_FragColor = vec4(color.rgb * mask, color.a);
}
