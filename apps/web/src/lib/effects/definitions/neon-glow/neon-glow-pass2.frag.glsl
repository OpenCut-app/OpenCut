precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform vec3 u_glowColor;

varying vec2 v_texCoord;

void main() {
  // Simple box blur of the bright extraction
  vec2 texel = 1.0 / u_resolution;
  vec4 sum = vec4(0.0);
  for (int x = -3; x <= 3; x++) {
    for (int y = -3; y <= 3; y++) {
      sum += texture2D(u_texture, v_texCoord + vec2(float(x), float(y)) * texel * 2.0);
    }
  }
  sum /= 49.0;

  // Tint with glow color and blend additively with original
  vec4 original = texture2D(u_texture, v_texCoord);
  vec3 glow = sum.rgb * u_glowColor * u_intensity;
  gl_FragColor = vec4(clamp(original.rgb + glow, 0.0, 1.0), original.a);
}
