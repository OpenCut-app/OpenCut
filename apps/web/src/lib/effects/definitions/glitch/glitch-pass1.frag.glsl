precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_colorSplit;
uniform float u_time;

varying vec2 v_texCoord;

float random(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = v_texCoord;

  // Block displacement — shift horizontal blocks randomly
  float blockY = floor(uv.y * 20.0 + u_time * 3.0);
  float blockShift = (random(vec2(blockY, u_time)) - 0.5) * u_intensity;
  uv.x += blockShift;

  // RGB channel split
  float r = texture2D(u_texture, uv + vec2(u_colorSplit, 0.0)).r;
  float g = texture2D(u_texture, uv).g;
  float b = texture2D(u_texture, uv - vec2(u_colorSplit, 0.0)).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
