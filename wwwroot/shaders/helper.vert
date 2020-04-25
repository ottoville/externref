#version 450
layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
} babylonuniforms;

layout(std430, set = 1, binding = 0) readonly buffer slopeArr {
    vec2 size;
    int numbers[];
} firstMatrix;
layout(std430, set = 1, binding = 1) readonly buffer facet1Arr {
    vec2 size;
    float numbers[];
} secondMatrix;

layout(std430, set = 1, binding = 2) readonly buffer facet2Arr {
    vec2 size;
    float numbers[];
} thirdMatrix;

layout(set = 1, binding = 3) uniform Uniforms {
    vec2 flatPos;
    float time;
    mat4 modelViewProjectionMatrix;
    mat4 world;
    mat4 worldViewProjection;
  } uniforms;

layout(location = 0) in vec3 position;

//const vec3 position=vec3(1.0,1.0,1.0);

//uniform vec2 flatPos;

//uniform mat4 world;
//uniform mat4 worldViewProjection;
//uniform float time;


//uniform highp isampler2D slopeArr;
//uniform sampler2D facet1Arr;
//uniform sampler2D facet2Arr;

const float PI = 3.1415926535897932384626433832795;
const float angleStep= (PI*2.0)/8.0;

float minX=-5000.0;
float minZ=-5000.0;

float maxX=5000.0;
float maxZ=5000.0;

float subdivisionsX = 250.0;
float subdivisionsY = 250.0;

float width = 10000.0;
float height = 10000.0;

vec4 getFacetAt( int cx, int cz) {
    // retrieve col and row from x, z coordinates in the ground local system
    
    //float col = floor((x+maxX) * subdivisionsX / width);
    //float row= floor(-(z+maxZ)*subdivisionsY / height + subdivisionsY);
    int col = int(floor((cx+maxX) * subdivisionsX / width));
    int row= int(floor(-(cz+maxZ)*subdivisionsY / height + subdivisionsY));

    //ivec4 slope =  texelFetch(slopeArr, ivec2(col,row), 0);
    int slope = firstMatrix.numbers[row*250 + col];
    vec4 facet;
    if(cz < -1 * cx + slope) {
        facet=vec4(secondMatrix.numbers[(row * 250 + col)*4], secondMatrix.numbers[(row * 250 + col)*4+1], secondMatrix.numbers[(row * 250 + col)*4+2], secondMatrix.numbers[(row * 250 + col)*4+3]);
    } else {
        facet=vec4(thirdMatrix.numbers[(row * 250 + col)*4], thirdMatrix.numbers[(row * 250 + col)*4+1], thirdMatrix.numbers[(row * 250 + col)*4+2], thirdMatrix.numbers[(row * 250 + col)*4+3]);
    }
    return facet;
}
float getHeightAtCoordinates2(vec2 xz) {
        vec4 facet = getFacetAt(int(xz.x), int(xz.y));
        float y = -(facet.x * xz.x + facet.z * xz.y + facet.w) / facet.y;
        return y;
}
void main(void) {
    //gl_Position = babylonuniforms.viewProjection * vec4(position, 1.0);

    //gl_Position = vec4(position.x,position.z, 0.0, 1.0);

       // vec4 worldcoords=world * vec4(position,1.0);
    
    float angle=uniforms.time+float(gl_InstanceIndex)*angleStep;
	float c = cos(angle);
	float s = sin(angle);

    vec2 rotated=vec2(position.x * c - position.z * s, position.x * s + position.z * c);

   // float posx=10.0*c;
    //float posz=10.0*s;
    //vec2 offset = vec2(rotated.x+posx, rotated.y+posz);
    vec2 offset = rotated+vec2(10.0*c, 10.0*s);
    //float offsetX=localposX+posx;
    //float offsetZ=localposZ+posz;

    //vec4 worldpos=world*vec4(offsetX,0,offsetZ,1.0);
    vec2 worldpos= offset + uniforms.flatPos;

    float posy=getHeightAtCoordinates2(vec2(worldpos.x,worldpos.y));

    vec3 newpos = vec3(worldpos.x,posy+2.0,worldpos.y);
   //gl_Position = uniforms.modelViewProjectionMatrix * vec4(newpos, 1.0);



   //gl_Position = uniforms.modelViewProjectionMatrix * vec4(uniforms.flatPos.x, 30.0, uniforms.flatPos.y, 1.0);
    //gl_Position = uniforms.modelViewProjectionMatrix * vec4(position.x, 30.0, position.z, 1.0);
   // gl_Position = babylonuniforms.viewPosition * vec4(position.x, 30.0, position.z, 1.0);


    mat4 finalWorld = uniforms.world;
    vec3 positionUpdated = position;
    positionUpdated.y=30.0;
    vec4 worldPos = finalWorld * vec4(positionUpdated, 1.0);
    //gl_Position = uniforms.modelViewProjectionMatrix * worldPos;
    gl_Position = uniforms.worldViewProjection * worldPos;
    gl_Position.y *= -1.;

}