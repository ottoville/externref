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

const float[7] bending = float[7](0,0,0.2,0.2,0.5,0.5,1.0);
const float[7] rot = float[7](0,0,1,1,1,1,1);

//const float[7] color = float[7](0.2,0.3,0.1,0.2,0.4,0.1,0.3);


layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
};
layout(set = 1, binding = 0) uniform Terra {
   float time;
} terra;


layout(location = 0) in vec4 positions;  // {xyz} (blade's position) + rotation
layout(location = 1) in vec4 shape;  // {x:scale, y:lean, z:curve, w:color} (blade's shape properties)

layout(location = 0) out vec4 color;

const float PI=3.141592653589793;

// Rotate by an angle //Todo: move to baking shader?
vec2 rotate (float x, float y, float r) {
	float c = cos(r);
	float s = sin(r);
	return vec2(x * c - y * s, x * s + y * c);
}
void main(void) {
    vec3 vertice=vec3(vertices[gl_VertexIndex].xy,0);
    float bend=bending[gl_VertexIndex];
    float windRotate=rot[gl_VertexIndex];

    //vec2 curved2 = rotate(vertice.y,0, seqment*shape.z);

    //How fast wind direction and intensivy change
    float windDelta=cos(terra.time*0.1)*PI*2;


    float windIntensivy=(cos(windDelta) * sin(windDelta*2)+1)*0.5;
    float windDirection=cos(windDelta*0.1)*PI*2;    //Wind direction changes most when wind intensity is lowest

     vec2 rotatedXZ= vec2(vertice.x * cos(positions.w), vertice.x * sin(positions.w));
     vec3 rotated=vec3(rotatedXZ.x, vertice.y, rotatedXZ.y);


    float angle=bend*shape.z*windIntensivy*PI*0.5;
    vec2 curvedXY = rotate(rotated.x, rotated.y, angle);
    
    vec3 curved = vec3(curvedXY.x, curvedXY.y, rotated.z);

    vec2 windrotatedXZ = rotate(curved.x, curved.z, windDirection*windRotate);
    vec3 windrotated=vec3(windrotatedXZ.x, curved.y, windrotatedXZ.y);

    vec3 scaled=shape.x*windrotated;
   // vec3 scaled=windrotated*10;

    
    vec4 worldPos = vec4(positions.xyz, 1.0) + vec4(scaled.x, scaled.y, scaled.z, 0.0);
    gl_Position = viewProjection * worldPos;
    gl_Position.y *= -1.;
    color=vec4(
    shape.w
    ,1.0,0.0,0.9);
}