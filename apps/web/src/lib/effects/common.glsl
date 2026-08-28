// Shared GLSL utility functions for color effects
// NOTE: WebGL 1 has no #include — copy relevant functions into each shader

// --- Luminance ---
// float luminance(vec3 color) {
//   return dot(color, vec3(0.2126, 0.7152, 0.0722));
// }

// --- RGB to HSL ---
// vec3 rgb2hsl(vec3 c) {
//   float maxC = max(c.r, max(c.g, c.b));
//   float minC = min(c.r, min(c.g, c.b));
//   float l = (maxC + minC) * 0.5;
//   if (maxC == minC) return vec3(0.0, 0.0, l);
//   float d = maxC - minC;
//   float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
//   float h;
//   if (maxC == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
//   else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
//   else h = (c.r - c.g) / d + 4.0;
//   h /= 6.0;
//   return vec3(h, s, l);
// }

// --- HSL to RGB ---
// float hue2rgb(float p, float q, float t) {
//   if (t < 0.0) t += 1.0;
//   if (t > 1.0) t -= 1.0;
//   if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
//   if (t < 1.0/2.0) return q;
//   if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
//   return p;
// }
// vec3 hsl2rgb(vec3 hsl) {
//   if (hsl.y == 0.0) return vec3(hsl.z);
//   float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
//   float p = 2.0 * hsl.z - q;
//   return vec3(
//     hue2rgb(p, q, hsl.x + 1.0/3.0),
//     hue2rgb(p, q, hsl.x),
//     hue2rgb(p, q, hsl.x - 1.0/3.0)
//   );
// }
