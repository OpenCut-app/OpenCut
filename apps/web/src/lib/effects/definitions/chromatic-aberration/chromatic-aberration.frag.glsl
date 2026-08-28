precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_angle;

varying vec2 v_texCoord;

void main() {
  // Offset direction based on angle
  vec2 dir = vec2(cos(u_angle), sin(u_angle)) * u_intensity;
  vec2 texel = dir / u_resolution;

  float r = texture2D(u_texture, v_texCoord + texel).r;
  float g = texture2D(u_texture, v_texCoord).g;
  float b = texture2D(u_texture, v_texCoord - texel).b;
  float a = texture2D(u_texture, v_texCoord).a;

  gl_FragColor = vec4(r, g, b, a);
}
