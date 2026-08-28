precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec3 u_shadows;
uniform vec3 u_midtones;
uniform vec3 u_highlights;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));

  // Weight regions by luminance
  float shadowWeight = 1.0 - smoothstep(0.0, 0.5, luma);
  float highlightWeight = smoothstep(0.5, 1.0, luma);
  float midtoneWeight = 1.0 - shadowWeight - highlightWeight;

  vec3 adjustment = u_shadows * shadowWeight
                  + u_midtones * midtoneWeight
                  + u_highlights * highlightWeight;

  color.rgb += adjustment;
  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
}
