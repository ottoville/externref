#version 300 es
#ifdef GL_ES
    precision highp float;
#endif

in vec3 position;

uniform mat4 worldViewProjection;
uniform float time;

uniform highp isampler2D slopeArr;
uniform sampler2D facet1Arr;
uniform sampler2D facet2Arr;

const float PI = 3.1415926535897932384626433832795;
const float angleStep= (PI*2.0)/8.0;

float maxX=5000.0;
float maxZ=5000.0;

float subdivisionsX = 250.0;
float subdivisionsY = 250.0;

float width = 10000.0;
float height = 10000.0;

vec4 _getFacetAt( float x, float z) {
    // retrieve col and row from x, z coordinates in the ground local system
    //var col = Math.floor((x + this._maxX) * this._subdivisionsX / this._width);
    float col = floor((x+maxX) * subdivisionsX / width);
    
    float row= floor(-(z-maxZ)*subdivisionsY / height + subdivisionsY);
    //var row = Math.floor(-(z + this._maxZ) * this._subdivisionsY / this._height + this._subdivisionsY);

    ivec4 slope =  texelFetch(slopeArr, ivec2(row, col), 0);

    //var quad = this._heightQuads[row * this._subdivisionsX + col];
    //var facet;
    vec4 facet;
    if(z < float(slope.x) * x + float(slope.y)) {
        facet = texelFetch(facet1Arr, ivec2(row, col), 0);
    } else {
        facet = texelFetch(facet2Arr, ivec2(row, col), 0);
    }
   // if (z < quad.slope.x * x + quad.slope.y) {
    //    facet = quad.facet1;
   // } else {
  //      facet = quad.facet2;
  //  }
    return facet;
}

void main(void) {


    float angle=time+float(gl_InstanceID)*angleStep;
	float c = cos(angle);
	float s = sin(angle);

    vec2 rotated=vec2(position.x * c - position.z * s, position.x * s + position.z * c);
    float localposX=rotated.x;
    float localposZ=rotated.y;

    float posx=10.0*c;
    float posz=10.0*s;




	vec4 ch = texelFetch(facet2Arr, ivec2(0, 0), 0);

//	ivec4 ch = texelFetch(slopeArr, ivec2(0, 0), 1);



	float posy = ch.r;

    //int posy = tvec.x;

    vec3 newpos = vec3(localposX+posx,posy,localposZ+posz);
    gl_Position = worldViewProjection * vec4(newpos, 1.0);

}