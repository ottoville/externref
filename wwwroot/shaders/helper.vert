#version 300 es
#ifdef GL_ES
    precision highp float;
#endif

in vec3 position;

uniform mat4 worldViewProjection;
uniform float time;
uniform highp isampler2D heightmap;

const float PI = 3.1415926535897932384626433832795;
const float angleStep= (PI*2.0)/8.0;


void main(void) {


    float angle=time+float(gl_InstanceID)*angleStep;
	float c = cos(angle);
	float s = sin(angle);

    vec2 rotated=vec2(position.x * c - position.z * s, position.x * s + position.z * c);
    float localposX=rotated.x;
    float localposZ=rotated.y;

    float posx=10.0*c;
    float posz=10.0*s;
    //uvec4 tvec=texture(heightmap,vec2(0.1,0.1));

    vec3 heightMapScale = vec3(0.004,0.004,0.004);
	vec2 vSamplePos = vec2(0.5,0.5);// * heightMapScale.xy;
	ivec4 ch = texture(heightmap, vSamplePos);
	float posy = float(ch.r);

    //int posy = tvec.x;

    vec3 newpos = vec3(localposX+posx,float(posy),localposZ+posz);
    gl_Position = worldViewProjection * vec4(newpos, 1.0);

}