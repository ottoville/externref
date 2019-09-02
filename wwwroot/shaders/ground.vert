#version 300 es
#ifdef GL_ES
    precision highp float;
#endif

in vec3 position;
in vec2 uv;
in vec3 normal;

out vec2 vUV;
out vec3 vPosition;
out vec3 vNormal;

uniform mat4 worldViewProjection;
uniform float time;

void main(void) {
    gl_Position = worldViewProjection * vec4(position, 1.0);
    vUV = uv;
    vPosition = position;
    vNormal = normal;
}