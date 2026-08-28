precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_radius;
uniform float u_softness;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  // Distance from center (0..~0.707 for corners)
  vec2 center = v_texCoord - 0.5;
  float dist = length(center);
  // Darken based on distance, radius, and softness
  float vignette = smoothstep(u_radius, u_radius - u_softness, dist);
  color.rgb *= mix(1.0, vignette, u_intensity);
  gl_FragColor = color;
}
