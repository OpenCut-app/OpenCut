precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_radius;

varying vec2 v_texCoord;

void main() {
  vec2 texel = 1.0 / u_resolution;
  int r = int(u_radius);

  // Simplified Kuwahara: find mode color in neighborhood
  vec3 sum = vec3(0.0);
  float count = 0.0;
  for (int x = -5; x <= 5; x++) {
    for (int y = -5; y <= 5; y++) {
      if (x*x + y*y > r*r) continue;
      sum += texture2D(u_texture, v_texCoord + vec2(float(x), float(y)) * texel).rgb;
      count += 1.0;
    }
  }
  gl_FragColor = vec4(sum / count, 1.0);
}
