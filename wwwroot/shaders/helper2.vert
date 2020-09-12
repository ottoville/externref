#version 450
precision lowp float;

uint facetSize= 250 * 250 * 4;

const vec2 vertices[4] = vec2[4](
            vec2(-0.5f, 2.0f),
            vec2(-0.5f, -2.0f),
            vec2(0.5f,  3.0f),
           vec2( 0.5f, -3.0f)
            );


layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
    vec3 cameraPosition;
};

layout(set = 0, binding = 1) uniform Time {
   float time;
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




//layout(std140, column_major) uniform;

#define CUSTOM_VERTEX_BEGIN

//layout(location = 0) in vec3 position;
const float PI = 3.1415926535897932384626433832795;
const float Epsilon = 0.0000001;
const float angleStep= (PI*2.0)/8.0;

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
    float angle= time+float(gl_InstanceIndex) * angleStep;
    float c = cos(angle);
	float s = sin(angle);
    vec3 position=vec3(vertices[gl_VertexIndex].x,1.5f,vertices[gl_VertexIndex].y);
    vec2 rotated=vec2(position.x * c - position.z * s, position.x * s + position.z * c);
   vec2 offset = rotated+vec2(10.0*c, 10.0*s);


    vec4 worldPos = world * vec4(offset.x, position.y, offset.y, 1.0);

   // float cx=worldPos.x;
   // float cz=worldPos.z;

   // int col = int(floor((cx+maxX) * subdivisionsX / width));
    //int row= int(floor(-(cz+maxZ)*subdivisionsY / height + subdivisionsY));
   // int slope = slopes.numbers[row*250 + col];
    //vec4 facet;
   // if(cz < -1 * cx + slope) {
     //   facet=vec4(facet1.numbers[(row * 250 + col)*4], facet1.numbers[(row * 250 + col)*4+1], facet1.numbers[(row * 250 + col)*4+2], facet1.numbers[(row * 250 + col)*4+3]);
    //} else {
    //    facet=vec4(facet2.numbers[(row * 250 + col)*4], facet2.numbers[(row * 250 + col)*4+1], facet2.numbers[(row * 250 + col)*4+2], facet2.numbers[(row * 250 + col)*4+3]);
    //}

    //worldPos.y += -(facet.x * cx + facet.z * cz + facet.w) / facet.y;
    worldPos.y += getHeightAtCoordinates(vec2(worldPos.x, worldPos.z))+20.0;

   gl_Position = viewProjection * worldPos;
    gl_Position.y *= -1.;
}