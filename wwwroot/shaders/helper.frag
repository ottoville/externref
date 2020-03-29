#version 450
layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
};
layout(location = 0) out vec4 outputColor;

void main(void) {
    outputColor=  vec4(1.0,1.0,1.0,0.9);
}