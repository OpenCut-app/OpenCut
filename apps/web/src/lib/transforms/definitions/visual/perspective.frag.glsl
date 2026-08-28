precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_rotateX;
uniform float u_rotateY;
uniform float u_perspective;
varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord - 0.5;

    // Simple perspective projection
    float z = 1.0 + u_perspective * (uv.x * u_rotateY + uv.y * u_rotateX);
    vec2 perspectiveUV = uv / z + 0.5;

    if (perspectiveUV.x < 0.0 || perspectiveUV.x > 1.0 ||
        perspectiveUV.y < 0.0 || perspectiveUV.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        gl_FragColor = texture2D(u_texture, perspectiveUV);
    }
}
