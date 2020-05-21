#version 450
precision lowp float;
layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
};
layout(set = 1, binding = 0) uniform LeftOver {
        mat4 world;
};
layout(std430, set = 1, binding = 1) readonly buffer Slopes {
    int numbers[];
} slopes;
layout(std430, set = 1, binding = 2) readonly buffer Facet1 {
    float numbers[];
} facet1;
layout(std430, set = 1, binding = 3) readonly buffer Facet2 {
    float numbers[];
} facet2;
#define CUSTOM_VERTEX_BEGIN

layout(location = 0) in vec3 position;

float minX=-5000.0;
float minZ=-5000.0;

float maxX=5000.0;
float maxZ=5000.0;

float subdivisionsX = 250.0;
float subdivisionsY = 250.0;

float width = 10000.0;
float height = 10000.0;

float getHeightAtCoordinates(vec2 xz) {
    float cx=xz.x;
    float cz=xz.y;

    int col = int(floor((cx+maxX) * subdivisionsX / width));
    int row= int(floor(-(cz+maxZ)*subdivisionsY / height + subdivisionsY));
    int slope = slopes.numbers[row*250 + col];
    vec4 facet;
    if(cz < -1 * cx + slope) {
        facet=vec4(facet1.numbers[(row * 250 + col)*4], facet1.numbers[(row * 250 + col)*4+1], facet1.numbers[(row * 250 + col)*4+2], facet1.numbers[(row * 250 + col)*4+3]);
    } else {
        facet=vec4(facet2.numbers[(row * 250 + col)*4], facet2.numbers[(row * 250 + col)*4+1], facet2.numbers[(row * 250 + col)*4+2], facet2.numbers[(row * 250 + col)*4+3]);
    }
    return -(facet.x * cx + facet.z * cz + facet.w) / facet.y;
 }

void main(void) {


    vec4 worldPos = world * vec4(position.x, 0, position.y, 1.0);
    worldPos.y += getHeightAtCoordinates(vec2(worldPos.x, worldPos.z));
    gl_Position = viewProjection * worldPos;
    gl_Position.y *= -1.;
}