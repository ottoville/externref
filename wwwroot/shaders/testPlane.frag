#version 450
precision lowp float;
layout(location = 0) out vec4 glFragColor;
layout(location = 0) in float color;

//uniform vec3 cameraPosition;

void main(void) {
    glFragColor=  vec4(vec3(1.0,1.0,0.0).xyz*color,1.0);
}