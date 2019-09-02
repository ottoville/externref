#version 300 es
#ifdef GL_ES
    precision highp float;
#endif

in vec3 position;

uniform mat4 worldViewProjection;
uniform float time;

void main(void) {
    gl_Position = worldViewProjection * vec4(position, 1.0);
}