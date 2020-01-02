#version 300 es
#ifdef GL_ES
    precision highp float;
#endif

in vec3 position;

uniform vec2 flatPos;

uniform mat4 world;
uniform mat4 worldViewProjection;
uniform float time;


uniform highp isampler2D slopeArr;
uniform sampler2D facet1Arr;
uniform sampler2D facet2Arr;

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

vec4 getFacetAt( float x, float z) {
    // retrieve col and row from x, z coordinates in the ground local system
    
    float col = floor((x+maxX) * subdivisionsX / width);
    float row= floor(-(z+maxZ)*subdivisionsY / height + subdivisionsY);

    ivec4 slope =  texelFetch(slopeArr, ivec2(col,row), 0);
    vec4 facet;
    if(z < -1.0 * x + float(slope.x)) {
        facet = texelFetch(facet1Arr, ivec2(col,row), 0);
    } else {
        facet = texelFetch(facet2Arr, ivec2( col,row), 0);
    }
    return facet;
}
float getHeightAtCoordinates2(vec2 xz) {
        vec4 facet = getFacetAt(xz.x, xz.y);
        float y = -(facet.x * xz.x + facet.z * xz.y + facet.w) / facet.y;
        return y;
}
void main(void) {
   // vec4 worldcoords=world * vec4(position,1.0);
    
    float angle=time+float(gl_InstanceID)*angleStep;
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
    vec2 worldpos= offset + flatPos;

    float posy=getHeightAtCoordinates2(vec2(worldpos.x,worldpos.y));

    vec3 newpos = vec3(worldpos.x,posy+2.0,worldpos.y);
    gl_Position = worldViewProjection * vec4(newpos, 1.0);

}