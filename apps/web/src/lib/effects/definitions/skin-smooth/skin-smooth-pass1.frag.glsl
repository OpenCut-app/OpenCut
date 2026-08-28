precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;

varying vec2 v_texCoord;

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec4 center = texture2D(u_texture, v_texCoord);

  // Bilateral filter: blur that preserves edges
  vec4 sum = vec4(0.0);
  float totalWeight = 0.0;

  for (int x = -4; x <= 4; x++) {
    for (int y = -4; y <= 4; y++) {
      vec2 offset = vec2(float(x), float(y)) * texel * u_intensity;
      vec4 sample_ = texture2D(u_texture, v_texCoord + offset);

      // Edge-aware weight: similar colors get higher weight
      float colorDist = distance(center.rgb, sample_.rgb);
      float spatialWeight = exp(-float(x*x + y*y) / 32.0);
      float colorWeight = exp(-colorDist * colorDist / 0.05);
      float weight = spatialWeight * colorWeight;

      sum += sample_ * weight;
      totalWeight += weight;
    }
  }

  gl_FragColor = vec4(sum.rgb / totalWeight, center.a);
}
