#version 450
precision lowp float;

const vec2 vertices[7] = vec2[7](
            vec2(0.02f,    0),
            vec2(-0.02f,   0) ,
            vec2(0.014f,    0.29f),
            vec2(-0.014f,   0.29f),
            vec2(0.007f,    0.57f),
            vec2(-0.007f,   0.57f), 
            vec2(0,      1.0f)
           );

vec3 normal = vec3(0,0,1);

const float[7] bending = float[7](0,0,0.2,0.2,0.5,0.5,1.0);
const float[7] rot = float[7](0,0,1,1,1,1,1);

//const float[7] color = float[7](0.2,0.3,0.1,0.2,0.4,0.1,0.3);


layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec3 cameraPosition;
};

layout(set = 0, binding = 1) uniform Terra {
   uint time;
   float delta;
   float windDelta;

} terra;

layout(set = 1, binding = 0) readonly buffer Lights {
    float matrix[];
};

layout(location = 0) in vec4 positions;  // {xyz} (blade's position) + rotation
layout(location = 1) in vec4 shape;  // {x:scale, y:baseAngle, z:curve, w:color} (blade's shape properties)

layout(location = 0) out vec4 color;
layout(location = 1) out float shading;
layout(location = 2) out vec3 ambient;

const float PI=3.141592653589793;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

// Rotate by an angle //Todo: move to baking shader?
vec2 rotate (float x, float y, float r) {
	float c = cos(r);
	float s = sin(r);
	return vec2(x * c - y * s, x * s + y * c);
}

const uint a = 12;
const uint b = 13;
const uint c = 14;

const float windDirection=0;


void main(void) {

   vec3 sunDirection=vec3(matrix[a],matrix[b],matrix[c]);
   ambient=vec3(matrix[20],matrix[21],matrix[22]);
   float shadow=matrix[23];



    vec3 vertice=vec3(vertices[gl_VertexIndex].xy,0);

    float windRotate=rot[gl_VertexIndex];

    //vec2 curved2 = rotate(vertice.y,0, seqment*shape.z);

    //How fast wind direction and intensivy change
    //float windDelta=cos(terra.time*0.1)*PI*2;


   // float windIntensivy=(cos(windDelta) * sin(windDelta*2)+1)*0.5;
    float windIntensivy=(cos((terra.time*0.01 + positions.x)*0.1)+1)*0.5;

    //float windDirection=cos(windDelta*0.1)*PI*2;    //Wind direction changes most when wind intensity is lowest

    float leanAndBaseCurve=shape.y + vertice.y*shape.z;

        //curve
    float curveAmount=vertice.y*shape.w + windIntensivy*vertice.y;
    float CosCurve=cos(curveAmount);
    float SinCurve=sin(curveAmount);

    mat3 MCurve = mat3(
        vec3(1,0,0),
        vec3(0,CosCurve,-SinCurve),
        vec3(0,SinCurve,CosCurve)
    );

    //rotate
    float rotateAmount=positions.w;
    float rotateAmountWind=windDirection*windRotate;
    float c = cos((rotateAmount+rotateAmountWind)/2);
    float s = sin((rotateAmount+rotateAmountWind)/2);
    mat3 m = mat3(
        vec3(c,0,s),
        vec3(0,1,0),
        vec3(-s,0,c)
    );

    mat3 mulMat=MCurve*m;
    vertice*=mulMat;
    normal*=mulMat;


    vec3 scaled=shape.x*vertice;

    
    vec4 worldPos = vec4(positions.xyz, 1.0) + vec4(scaled.x, scaled.y, scaled.z, 0.0);

    vec3 viewDirectionW = normalize(cameraPosition - worldPos.xyz);
    normal*=sign(dot(viewDirectionW, normal));

    float diffuse = dot(normal, sunDirection)*shadow;



    gl_Position = viewProjection * worldPos;

    vec3 green=vec3(clamp(shape.w,0,1),1.0,0.0)*diffuse;


    color=vec4(green.rgb,1.0);
}