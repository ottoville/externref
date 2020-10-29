#version 450
precision lowp float;

uint facetSize= 250 * 250 * 4;

layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec3 viewPosition;
};

layout(std430, set = 1, binding = 0) readonly buffer Slopes {
    int numbers[];
} slopes;
layout(std430, set = 1, binding = 1) readonly buffer Facet12 {
    float numbers[];
} facet12;

layout(set = 2, binding = 0) uniform LeftOver {
        mat4 world;
};

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
        facet=vec4(facet12.numbers[(row * 250 + col)*4], facet12.numbers[(row * 250 + col)*4+1], facet12.numbers[(row * 250 + col)*4+2], facet12.numbers[(row * 250 + col)*4+3]);
    } else {
        facet=vec4(facet12.numbers[facetSize + ((row * 250 + col)*4)], facet12.numbers[facetSize + ((row * 250 + col)*4+1)], facet12.numbers[facetSize + ((row * 250 + col)*4+2)], facet12.numbers[facetSize + ((row * 250 + col)*4+3)]);
    }
    return -(facet.x * cx + facet.z * cz + facet.w) / facet.y;
 }

void main(void) {


    vec4 worldPos = world * vec4(position.x, 0, position.y, 1.0);
    worldPos.y += getHeightAtCoordinates(vec2(worldPos.x, worldPos.z));
    gl_Position = viewProjection * worldPos;
}