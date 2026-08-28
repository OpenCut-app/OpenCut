precision mediump float;
uniform sampler2D u_textureA;
uniform sampler2D u_textureB;
uniform float u_progress;
uniform float u_zoomAmount;
varying vec2 v_texCoord;

void main() {
    // Zoom out A, zoom in B
    float scaleA = 1.0 + u_progress * u_zoomAmount;
    float scaleB = 1.0 + (1.0 - u_progress) * u_zoomAmount;

    vec2 centerA = (v_texCoord - 0.5) / scaleA + 0.5;
    vec2 centerB = (v_texCoord - 0.5) * scaleB + 0.5;

    vec4 colorA = texture2D(u_textureA, centerA);
    vec4 colorB = texture2D(u_textureB, centerB);

    // Fade based on progress
    float fade = smoothstep(0.3, 0.7, u_progress);
    gl_FragColor = mix(colorA, colorB, fade);
}
