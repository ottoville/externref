#version 450
layout(location = 0) out vec4 glFragColor;
layout(location = 0) in float shading;
layout(location = 1) in vec3 ambient;


void main(void) {
    glFragColor =  vec4(ambient,0)+vec4(0.0,0.0,1.0,1.0) *  vec4(shading,shading,shading,1.0);
}