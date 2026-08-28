precision mediump float;
uniform sampler2D u_textureA;
uniform sampler2D u_textureB;
uniform float u_progress;
varying vec2 v_texCoord;

void main() {
    vec4 colorA = texture2D(u_textureA, v_texCoord);
    vec4 colorB = texture2D(u_textureB, v_texCoord);
    gl_FragColor = mix(colorA, colorB, u_progress);
}
