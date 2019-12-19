#version 300 es
#ifdef GL_ES
    precision highp float;
#endif

in vec3 position;

uniform mat4 world;
uniform mat4 worldViewProjection;
uniform float time;
uniform vec2 flatpos;

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

//   vec3 TransformCoordinates(float x, float y, float z, mat4 m) {
//        float rx = x * m[0][0] + y * m[1][0] + z * m[2][0] + m[3][0];
//        float ry = x * m[0][1] + y * m[1][1] + z * m[2][1] + m[3][1];
//        float rz = x * m[0][2] + y * m[1][2] + z * m[2][2] + m[3][2];
//        float rw = 1.0 / (x * m[0][3] + y * m[1][3] + z * m[2][3] + m[3][3]);

//        return vec3(rx * rw,ry * rw, rz * rw);
//    }
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
float getHeightAtCoordinates2(float x, float z) {

        float newx = x;
        float newz = z;
        vec4 facet = getFacetAt(newx, newz);
        float y = -(facet.x * newx + facet.z * newz + facet.w) / facet.y;
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
    float posy=getHeightAtCoordinates2(flatpos.x+offsetX,flatpos.y+offsetZ);

    vec3 newpos = vec3(offsetX,posy+2.0,offsetZ);
    gl_Position = worldViewProjection * vec4(newpos, 1.0);

}