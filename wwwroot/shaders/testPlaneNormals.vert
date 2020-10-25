#version 450
precision lowp float;

//Sun radius and distance is divided by 100000

 vec2 rotate (float x, float y, float r) {
	float c = cos(r);
	float s = sin(r);
	return vec2(x * c - y * s, x * s + y * c);
}
const vec2 vertices[7] = vec2[7](
            vec2(0,  0),
            vec2(1,   0) ,
            vec2(0,   1),
            vec2(1,  1),
            vec2(0,  2),
            vec2(1,  2),
            vec2(0,  3)
           );

const float[7] rot = float[7](0,0,1,1,1,1,1);
const float PI=3.141592653589793;
vec3 normal = vec3(0,0,1);

const uint sunDistance= 1495000;  //divided by 100000 correct one

layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
    vec3 cameraPosition;
} scene;

layout(set = 0, binding = 1) uniform Terra {
   uint time;
   float delta;
   float windDelta;

} terra;

layout(set = 1, binding = 0) readonly buffer Lights {
    float matrix[];
};
const uint a = 12;
const uint b = 13;
const uint c = 14;

const float windDirection=0;

void main(void) {
    
    vec3 position=vec3(vertices[int(floor(gl_VertexIndex / 2)) ].xy,0);

            //How fast wind direction and intensivy change
    float windDelta=cos(terra.time*0.0001)*PI*2;

    float windRotate=rot[gl_VertexIndex];
    //float windIntensivy=(cos(windDelta) * sin(windDelta*2)+1)*0.5;
    float windIntensivy=terra.windDelta;
   // float windDirection=cos(windDelta*0.1)*PI*2;    //Wind direction changes most when wind intensity is lowest

    float shapeW=0.5;

    //curve
    float curveAmount=(position.y/3)*shapeW+ windIntensivy*0.3*(position.y/3);
    float CosCurve=cos(curveAmount);
    float SinCurve=sin(curveAmount);

    mat3 MCurve = mat3(
        vec3(1,0,0),
        vec3(0,CosCurve,-SinCurve),
        vec3(0,SinCurve,CosCurve)
    );

    //rotate
    //float rotateAmount=PI/2;
    float rotateAmountWind=windDirection*windRotate;
    float rotateAmount=0;
    float c = cos(rotateAmount+rotateAmountWind);
    float s = sin(rotateAmount+rotateAmountWind);
    mat3 m = mat3(
        vec3(c,0,s),
        vec3(0,1,0),
        vec3(-s,0,c)
    );

    mat3 mulMat=MCurve*m;
    position*=mulMat;
    normal*=mulMat;

   // position.xz=rotate(position.x, position.z, rotateAmount);
  //  normal.xz=rotate(normal.x, normal.z, rotateAmount);


    position*=200;


    vec3 viewDirectionW = normalize(scene.cameraPosition - position);
    normal*=sign(dot(viewDirectionW, normal));
    if(int(gl_VertexIndex)%2 == 1) {
        position+=(normal*30);
    }



    vec4 worldPos = vec4(position.xyz,1.0);
    gl_Position = scene.viewProjection * worldPos;
    gl_Position.y *= -1.;

 }