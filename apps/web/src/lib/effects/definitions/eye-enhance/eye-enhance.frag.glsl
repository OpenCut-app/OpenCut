precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_brightness;
uniform float u_contrast;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  // Brightness + contrast enhancement for eye regions
  color.rgb += u_brightness;
  color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
}
