#version 450
precision lowp float;


layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
    vec3 cameraPosition;
};

layout(set = 1, binding = 0) readonly buffer Lights {
    float matrix[];
};
//layout(set = 1, binding = 0) uniform Lights {
//    vec3 sund;
//    uint lightsAmount;
//    float otherLights[];
//};




layout(location = 0) in vec3 position;
layout(location = 1) in vec2 uv;
layout(location = 2) in vec3 normal;

layout(location = 0) out vec2 v_uv;
layout(location = 1) out float shading;
layout(location = 2) out vec3 ambient;


const uint a = 12;
const uint b = 13;
const uint c = 14;

void main(void) {
   gl_Position = viewProjection*vec4(position.xyz, 1.0);
  // gl_Position.y *= -1.;


   vec3 sunDirection=vec3(matrix[a],matrix[b],matrix[c]);
   ambient=vec3(matrix[20],matrix[21],matrix[22]);
   float shadow=matrix[23];
   //vec3 modelViewNormal = vec3(view * vec4(normal, 0.0));
    // Calculate the dot product of the light vector and vertex normal. If the normal and light vector are
    // pointing in the same direction then it will get max illumination.
    //float diffuse = max(dot(modelViewNormal, sunDirection), 0.0);



   // float ambient=      clamp((sunDirection.y+0.1)*0.4 - 0.1        ,0.05, 0.3);
   // float ambientRed=   clamp((sunDirection.y*2+0.4)*0.8              ,0.05, 0.3);

    vec3 color=vec3(0.0,1.0,0.0);
   // vec3 color=vec3(0.5,1.0,0.5)*(vec3(snoise(position.xz*0.2)+1,snoise(position.zx*0.2)+1,snoise(position.xy*0.2)+1)*0.5);

    //earth shadow
  //  float shadow=clamp(sunDirection.y*8+1,0,1);

    //earth athmosphere
    //color.r=min(0.9*(sunDirection.y+0.1),color.r);
   // color.r=min(color.r*(1-sunDirection.y),255);
  //  color.g=min(color.g*0.8*(sunDirection.y+0.5),color.g);
  //  color.b=min(color.b*0.6*(sunDirection.y+0.5),color.b);

    float diffuse = dot(normal, sunDirection)*shadow;


 //   vec3 afterDiffuse=color*diffuse;
  //  vec3 afterAmbient=max(afterDiffuse,ambient);

    shading=diffuse;


  //  vec3 afterAmbient=vec3(max(afterDiffuse.x, ambient.r),max(afterDiffuse.y, ambient.g), max(afterDiffuse.z, ambient.b));


  //  v_Color = vec4(afterAmbient,1.0);
    v_uv=(position.xz+5000) / 10000;
  // v_Normal = vec3(view * vec4(normals, 0.0));
}