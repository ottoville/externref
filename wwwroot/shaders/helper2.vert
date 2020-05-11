#version 450
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

layout(set = 2, binding = 0) uniform Terra {
   int time;
} terra;

precision highp float;
//layout(std140, column_major) uniform;

#define CUSTOM_VERTEX_BEGIN

layout(location = 0) in vec3 position;
const float PI = 3.1415926535897932384626433832795;
const float Epsilon = 0.0000001;
const float angleStep= (PI*2.0)/8.0;

void main(void) {
    float angle=float(gl_InstanceIndex) * angleStep;
    float c = cos(angle);
	float s = sin(angle);
    
  //  vec2 rotated=vec2(position.x * c - position.z * s, position.x * s + position.z * c);
    //vec2 offset = rotated+vec2(10.0*c, 10.0*s);
    vec2 offset = vec2(10.0*c, 10.0*s);

    mat4 newWorld =  world + mat4(0,0,0,0,0,0,0,0,0,0,0,0,offset.x,0,offset.y,0);
    vec4 worldPos = newWorld * vec4(position, 1.0);
   // vec4 worldPos = world * vec4(position, 1.0);
    gl_Position = viewProjection * worldPos;
    gl_Position.y *= -1.;
}