#version 450
precision highp float;

layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
};
layout(set = 1, binding = 0) uniform Terra {
   float time;
} terra;

void main(void) {


}