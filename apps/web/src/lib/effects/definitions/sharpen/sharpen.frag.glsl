precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;

varying vec2 v_texCoord;

void main() {
  vec2 texel = 1.0 / u_resolution;
  // Unsharp mask: center - average of neighbors
  vec4 center = texture2D(u_texture, v_texCoord);
  vec4 top    = texture2D(u_texture, v_texCoord + vec2(0.0, texel.y));
  vec4 bottom = texture2D(u_texture, v_texCoord - vec2(0.0, texel.y));
  vec4 left   = texture2D(u_texture, v_texCoord - vec2(texel.x, 0.0));
  vec4 right  = texture2D(u_texture, v_texCoord + vec2(texel.x, 0.0));

  vec4 edges = center * 4.0 - top - bottom - left - right;
  gl_FragColor = vec4(clamp(center.rgb + edges.rgb * u_intensity, 0.0, 1.0), center.a);
}
