#version 450
precision lowp float;

layout(location = 0) out float shading;
layout(location = 1) out vec3 ambient;


const ivec3 vertices[4] = ivec3[4](
            ivec3(-50000,     3,   -50000),
            ivec3(50000,      3,   -50000),
            ivec3(-50000,     3,   50000),
            ivec3(50000,      3,   50000)
           );

layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
};
layout(set = 0, binding = 1) uniform Terra {
   uint time;
   float delta;
   float windDelta;

} terra;

layout(set = 1, binding = 0) readonly buffer Lights {
    float matrix[];
};

const ivec3 normal = ivec3(0,1,0);

void main(void) {
    ivec4 worldPos = ivec4(vertices[gl_VertexIndex], 1);
    gl_Position = viewProjection * worldPos;

    vec3 sunDirection=vec3(matrix[12],matrix[13],matrix[14]);
    ambient=vec3(matrix[20],matrix[21],matrix[22]);
    float shadow=matrix[23];

    shading = dot(normal, sunDirection)*shadow;

}