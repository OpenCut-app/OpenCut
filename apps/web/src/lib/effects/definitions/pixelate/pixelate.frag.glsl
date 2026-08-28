precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_blockSize;

varying vec2 v_texCoord;

void main() {
  // Floor UV to block grid, sample from block center
  vec2 blockCoord = floor(v_texCoord * u_resolution / u_blockSize) * u_blockSize;
  vec2 sampleUV = (blockCoord + u_blockSize * 0.5) / u_resolution;
  gl_FragColor = texture2D(u_texture, sampleUV);
}
