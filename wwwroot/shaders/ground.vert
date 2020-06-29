#version 450
precision lowp float;

layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
};

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 uv;

void main(void) {
   gl_Position = viewProjection*vec4(position.xyz, 1.0);
   gl_Position.y *= -1.;
}