precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_strength;
uniform float u_zoom;
varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord;
    vec2 center = vec2(0.5, 0.5);
    vec2 delta = uv - center;
    float dist = length(delta);

    // Barrel/pincushion distortion
    float distortion = 1.0 + dist * dist * u_strength;
    vec2 distortedUV = center + delta * distortion * u_zoom;

    // Clamp to valid UV range
    if (distortedUV.x < 0.0 || distortedUV.x > 1.0 ||
        distortedUV.y < 0.0 || distortedUV.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        gl_FragColor = texture2D(u_texture, distortedUV);
    }
}
