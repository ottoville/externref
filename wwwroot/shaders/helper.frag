#version 300 es
#ifdef GL_ES
    precision highp float;
#endif

out vec4 outputColor;

uniform vec3 cameraPosition;

void main(void) {
    outputColor=  vec4(1.0,1.0,1.0,0.9);
}