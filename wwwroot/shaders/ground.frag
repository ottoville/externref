#version 450

layout(location = 0) in vec4 v_Color;
layout(location = 1) in vec2 v_uv;
layout(location = 0) out vec4 glFragColor;


//layout(location = 0) in vec3 normal;


//layout(set = 1, binding = 0) readonly buffer Lights {
 //   float matrix[];
//};

//in vec3 vPosition;
//in vec3 vNormal;
//in vec2 vUV;
//out vec4 outputColor;



//uniform sampler2D groundTexture;
//uniform mat4 world;
//uniform vec3 lightPos;
//uniform vec3 cameraPosition;

//layout(set = 0, binding = 0) uniform Camera {
//    vec3 cameraPosition;
//} camera;

const uint alignment=256;
const uint maxInstances=10;
const uint i=0;

const uint a = 12;
const uint b = 13;
const uint c = 14;


void main(void) {
//glFragColor=vec4(v_Color.xyz*((snoise(v_uv*2)+1)*0.5),v_Color.w);
glFragColor=v_Color;

    //glFragColor = vec4(0.0,1.0,0.0,1.0);

  //  vec3 lpos=vec3(matrix[i+12],matrix[i+13],matrix[i+14]);


    //To test sun position change
  //  glFragColor = vec4(abs(matrix[a])/1495000,abs(matrix[b])/1495000,abs(matrix[c])/1495000,1.0);
  //  glFragColor = vec4(normal.xyz,1.0);

   // float specularStrength = 0.2;

    //https://cyos.babylonjs.com/#1HF00B
    //https://learnopengl.com/Lighting/Basic-Lighting
    //vec3 vPositionW = vec3(world * vec4(vPosition, 1.0));
   // vec3 vNormalW = normalize(vec3(world * vec4(vNormal, 0.0)));

    

    //light //ambient
    //vec3 color = texture(groundTexture, vUV).rgb *0.8;


    // diffuse
    //vec3 lightVectorW = normalize(lightPos - vPositionW);
   // float diffuse = max(0., dot(vNormalW, lightVectorW));

    // Specular
   // vec3 norm = normalize(vNormalW);
  //  vec3 viewDirectionW = normalize(cameraPosition - vPositionW);
  //  vec3 reflectDir = reflect(-lightVectorW, norm);  
    //float mmax=max(dot(viewDirectionW, reflectDir), 0.0);
    //float spec = pow(mmax, 32.0) * specularStrength;

    //outputColor=  vec4(color * (diffuse + vec3(spec)), 1.);//texture(groundTexture, vUV);
}