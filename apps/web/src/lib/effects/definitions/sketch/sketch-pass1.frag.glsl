precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_lineWidth;

varying vec2 v_texCoord;

void main() {
  vec2 texel = u_lineWidth / u_resolution;

  // Sobel edge detection on luminance
  float tl = dot(texture2D(u_texture, v_texCoord + vec2(-texel.x, texel.y)).rgb, vec3(0.2126, 0.7152, 0.0722));
  float t  = dot(texture2D(u_texture, v_texCoord + vec2(0.0, texel.y)).rgb, vec3(0.2126, 0.7152, 0.0722));
  float tr = dot(texture2D(u_texture, v_texCoord + vec2(texel.x, texel.y)).rgb, vec3(0.2126, 0.7152, 0.0722));
  float l  = dot(texture2D(u_texture, v_texCoord + vec2(-texel.x, 0.0)).rgb, vec3(0.2126, 0.7152, 0.0722));
  float r  = dot(texture2D(u_texture, v_texCoord + vec2(texel.x, 0.0)).rgb, vec3(0.2126, 0.7152, 0.0722));
  float bl = dot(texture2D(u_texture, v_texCoord + vec2(-texel.x, -texel.y)).rgb, vec3(0.2126, 0.7152, 0.0722));
  float b  = dot(texture2D(u_texture, v_texCoord + vec2(0.0, -texel.y)).rgb, vec3(0.2126, 0.7152, 0.0722));
  float br = dot(texture2D(u_texture, v_texCoord + vec2(texel.x, -texel.y)).rgb, vec3(0.2126, 0.7152, 0.0722));

  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  float edge = sqrt(gx*gx + gy*gy);

  gl_FragColor = vec4(vec3(edge), 1.0);
}
