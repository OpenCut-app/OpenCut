precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_speed;
uniform float u_time;
varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord;

    // Animated wave distortion
    float wave = sin(uv.y * u_frequency + u_time * u_speed) * u_amplitude;
    uv.x += wave;

    if (uv.x < 0.0 || uv.x > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        gl_FragColor = texture2D(u_texture, uv);
    }
}
