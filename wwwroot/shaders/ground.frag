#version 450
layout(set = 2, binding = 0) uniform sampler mySampler;
layout(set = 2, binding = 1) uniform texture2D myTexture;

layout(location = 0) in vec2 v_uv;
layout(location = 1) in float shading;
layout(location = 2) in vec3 ambient;
layout(location = 0) out vec4 glFragColor;



void main(void) {


//glFragColor=v_Color;
glFragColor =  vec4(ambient,0)+texture(sampler2D(myTexture, mySampler), v_uv) *  vec4(shading,shading,shading,1.0);
}