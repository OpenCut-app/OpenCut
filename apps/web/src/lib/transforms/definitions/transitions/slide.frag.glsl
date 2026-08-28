precision mediump float;
uniform sampler2D u_textureA;
uniform sampler2D u_textureB;
uniform float u_progress;
uniform int u_direction; // 0=left, 1=right, 2=up, 3=down
varying vec2 v_texCoord;

void main() {
    vec2 uvA = v_texCoord;
    vec2 uvB = v_texCoord;

    if (u_direction == 0) {
        uvA.x += u_progress;
        uvB.x += u_progress - 1.0;
    } else if (u_direction == 1) {
        uvA.x -= u_progress;
        uvB.x -= u_progress - 1.0;
    } else if (u_direction == 2) {
        uvA.y -= u_progress;
        uvB.y -= u_progress - 1.0;
    } else {
        uvA.y += u_progress;
        uvB.y += u_progress - 1.0;
    }

    vec4 colorA = texture2D(u_textureA, uvA);
    vec4 colorB = texture2D(u_textureB, uvB);

    // Show A if in bounds, otherwise B
    bool inBoundsA = uvA.x >= 0.0 && uvA.x <= 1.0 && uvA.y >= 0.0 && uvA.y <= 1.0;
    bool inBoundsB = uvB.x >= 0.0 && uvB.x <= 1.0 && uvB.y >= 0.0 && uvB.y <= 1.0;

    if (inBoundsA && inBoundsB) {
        gl_FragColor = mix(colorA, colorB, 0.5);
    } else if (inBoundsA) {
        gl_FragColor = colorA;
    } else if (inBoundsB) {
        gl_FragColor = colorB;
    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}
