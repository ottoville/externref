#version 450
precision lowp float;

//Sun radius and distance is divided by 100000

//const ivec2 vertices[4] = ivec2[4](
 //           ivec2(-6963,-6963),
 //           ivec2(6963,-6963),
 //           ivec2(-6963,6963),
 //           ivec2(6963,6963)
 //           );


 const ivec2 vertices[14] = ivec2[14](
            ivec2( -6824, 1557),
            ivec2( -6824, -1557),
            ivec2( -5472,4364),
            ivec2( -5472,-4364),
            ivec2( -3037,6306),
            ivec2( -3037,-6306),
            ivec2( 0, 7000),
            ivec2( 0, -7000),
            ivec2( 3037, 6306),
            ivec2( 3037, -6306),
            ivec2( 5472, 4364),
            ivec2( 5472, -4364),
            ivec2( 6824, 1557),
            ivec2( 6824, -1557)
);

layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
    vec3 cameraPosition;
} scene;
layout(set = 1, binding = 0) uniform Position {
        mat4 world;
};
mat4 world2=mat4(
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0);

void main(void) {
    //ivec4 position=ivec4(vertices[gl_VertexIndex].xy,0,1);
    ivec3 position=ivec3(vertices[gl_VertexIndex].xy,0);

    vec3 transform=vec3(world[3][0], world[3][1], world[3][2]);

   // vec3 CameraRight_worldspace = vec3(scene.view[0][0], scene.view[1][0], scene.view[2][0]);
   // vec3 CameraUp_worldspace  = vec3(scene.view[0][1], scene.view[1][1], scene.view[2][1]);
   // vec3 vertexPosition_worldspace =
  //  vec3(vertices[gl_VertexIndex].xy,1)
  //  + CameraRight_worldspace * squareVertices.x * BillboardSize.x
  //  + CameraUp_worldspace * squareVertices.y * BillboardSize.y;



    //ivec4 position=ivec4(vertices[gl_VertexIndex].x,vertices[gl_VertexIndex].y,10000000,1);

    //distance is divided by 100000
    //1500000
   

    //vec4 worldPos = position;
   // vec4 worldPos = world*position;
    vec4 worldPos = vec4((position+transform).xyz,1.0);

    gl_Position = scene.viewProjection * worldPos;
    gl_Position.y *= -1.;

}