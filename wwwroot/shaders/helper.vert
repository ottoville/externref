#version 300 es
#ifdef GL_ES
    precision highp float;
#endif

in vec3 position;

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
    if(z < float(slope.x) * x + float(slope.y)) {
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
//float getHeightAtCoordinates(float x, float z) {
//    mat4 invMat = inverse(world);
 //   vec3 tmpVect=TransformCoordinates(x, 0.0, z, invMat); // transform x,z in the mesh local space
//    float newx = tmpVect.x;
//    float newz = tmpVect.z;
//    if (newx < minX || newx > maxX || newz < minZ || newz > maxZ) {
//        return 0.0;
//    }
//    vec4 facet = getFacetAt(newx, newz);
//    float y = -(facet.x * newx + facet.z * newz + facet.w) / facet.y;
    // return y in the World system
//    vec3 tmpVect2= TransformCoordinates(0.0, y, 0.0, world);
//    return tmpVect2.y;
//}
    


void main(void) {
    vec4 worldcoords=world * vec4(position,1.0);
    
    float angle=time+float(gl_InstanceID)*angleStep;
	float c = cos(angle);
	float s = sin(angle);

    vec2 rotated=vec2(position.x * c - position.z * s, position.x * s + position.z * c);
    float localposX=rotated.x;
    float localposZ=rotated.y;

    float posx=10.0*c;
    float posz=10.0*s;
    float offsetX=localposX+posx;
    float offsetZ=localposZ+posz;

    vec4 worldpos=world*vec4(offsetX,0,offsetZ,1.0);
    float posy=getHeightAtCoordinates2(vec2(worldpos.x,worldpos.z));

    vec3 newpos = vec3(offsetX,posy+2.0,offsetZ);
    gl_Position = worldViewProjection * vec4(newpos, 1.0);

}