precision mediump float;
uniform sampler2D u_textureA;
uniform sampler2D u_textureB;
uniform float u_progress;
uniform int u_direction; // 0=left, 1=right, 2=up, 3=down
uniform float u_softness;
varying vec2 v_texCoord;

void main() {
    vec4 colorA = texture2D(u_textureA, v_texCoord);
    vec4 colorB = texture2D(u_textureB, v_texCoord);

    float edge;
    if (u_direction == 0) {
        edge = v_texCoord.x;
    } else if (u_direction == 1) {
        edge = 1.0 - v_texCoord.x;
    } else if (u_direction == 2) {
        edge = 1.0 - v_texCoord.y;
    } else {
        edge = v_texCoord.y;
    }

    float softEdge = smoothstep(u_progress - u_softness, u_progress + u_softness, edge);
    gl_FragColor = mix(colorB, colorA, softEdge);
}
