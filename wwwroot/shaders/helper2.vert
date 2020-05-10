layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
};
layout(set = 1, binding = 0) uniform LeftOver {
        mat4 world;
};

precision highp float;
//layout(std140, column_major) uniform;

#define CUSTOM_VERTEX_BEGIN

layout(location = 0) in vec3 position;
const float PI = 3.1415926535897932384626433832795;
const float Epsilon = 0.0000001;

void main(void) {
    vec4 worldPos = world * vec4(position, 1.0);
    gl_Position = viewProjection * worldPos;
    gl_Position.y *= -1.;
}