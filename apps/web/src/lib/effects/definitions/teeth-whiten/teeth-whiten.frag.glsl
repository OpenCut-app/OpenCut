precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  // Desaturate + brighten for whitening effect
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 desaturated = mix(color.rgb, vec3(luma), u_intensity);
  vec3 brightened = desaturated + u_intensity * 0.1;
  gl_FragColor = vec4(clamp(brightened, 0.0, 1.0), color.a);
}
