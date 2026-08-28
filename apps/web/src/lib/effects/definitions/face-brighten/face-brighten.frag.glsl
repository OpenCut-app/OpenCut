precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  // Soft light blend — brightens without blowing out highlights
  vec3 brightened = color.rgb + color.rgb * (1.0 - color.rgb) * u_intensity;
  gl_FragColor = vec4(clamp(brightened, 0.0, 1.0), color.a);
}
