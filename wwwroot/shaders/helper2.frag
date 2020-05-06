layout(set = 2, binding = 0) uniform LeftOver {
        mat4 world;
};

precision highp float;
layout(std140, column_major) uniform;
layout(set = 1, binding = 0) uniform Material
{
vec4 diffuseLeftColor;
vec4 diffuseRightColor;
vec4 opacityParts;
vec4 reflectionLeftColor;
vec4 reflectionRightColor;
vec4 refractionLeftColor;
vec4 refractionRightColor;
vec4 emissiveLeftColor;
vec4 emissiveRightColor;
vec2 vDiffuseInfos;
vec2 vAmbientInfos;
vec2 vOpacityInfos;
vec2 vReflectionInfos;
vec3 vReflectionPosition;
vec3 vReflectionSize;
vec2 vEmissiveInfos;
vec2 vLightmapInfos;
vec2 vSpecularInfos;
vec3 vBumpInfos;
mat4 diffuseMatrix;
mat4 ambientMatrix;
mat4 opacityMatrix;
mat4 reflectionMatrix;
mat4 emissiveMatrix;
mat4 lightmapMatrix;
mat4 specularMatrix;
mat4 bumpMatrix;
vec2 vTangentSpaceParams;
float pointSize;
mat4 refractionMatrix;
vec4 vRefractionInfos;
vec4 vSpecularColor;
vec3 vEmissiveColor;
float visibility;
vec4 vDiffuseColor;
};
layout(set = 0, binding = 0) uniform Scene {
mat4 viewProjection;
mat4 view;
vec4 viewPosition;
};
layout(location = 0) out vec4 glFragColor;
void main(void) {
glFragColor = vec4(1.0,1.0,1.0,0.9);
}