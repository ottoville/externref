layout(set = 2, binding = 0) uniform LeftOver {
        mat4 world;
};

precision highp float;
layout(std140, column_major) uniform;
layout(set = 1, binding = 0) uniform Material {
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
#define CUSTOM_VERTEX_BEGIN

layout(location = 0) in vec3 position;
const float PI = 3.1415926535897932384626433832795;
const float LinearEncodePowerApprox = 2.2;
const float GammaEncodePowerApprox = 1.0 / LinearEncodePowerApprox;
const vec3 LuminanceEncodeApprox = vec3(0.2126, 0.7152, 0.0722);
const float Epsilon = 0.0000001;
#define saturate(x)         clamp(x, 0.0, 1.0)

#define absEps(x)           abs(x) + Epsilon

#define maxEps(x)           max(x, Epsilon)

#define saturateEps(x)      clamp(x, Epsilon, 1.0)

mat3 transposeMat3(mat3 inMatrix) {
    vec3 i0 = inMatrix[0];
    vec3 i1 = inMatrix[1];
    vec3 i2 = inMatrix[2];
    mat3 outMatrix = mat3(
        vec3(i0.x, i1.x, i2.x),
        vec3(i0.y, i1.y, i2.y),
        vec3(i0.z, i1.z, i2.z)
    );
    return outMatrix;
}
mat3 inverseMat3(mat3 inMatrix) {
    float a00 = inMatrix[0][0], a01 = inMatrix[0][1], a02 = inMatrix[0][2];
    float a10 = inMatrix[1][0], a11 = inMatrix[1][1], a12 = inMatrix[1][2];
    float a20 = inMatrix[2][0], a21 = inMatrix[2][1], a22 = inMatrix[2][2];
    float b01 = a22 * a11 - a12 * a21;
    float b11 = -a22 * a10 + a12 * a20;
    float b21 = a21 * a10 - a11 * a20;
    float det = a00 * b01 + a01 * b11 + a02 * b21;
    return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11),
    b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10),
    b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;
}
vec3 toLinearSpace(vec3 color)
{
    return pow(color, vec3(LinearEncodePowerApprox));
}
vec3 toGammaSpace(vec3 color)
{
    return pow(color, vec3(GammaEncodePowerApprox));
}
float toGammaSpace(float color)
{
    return pow(color, GammaEncodePowerApprox);
}
float square(float value)
{
    return value * value;
}
float pow5(float value) {
    float sq = value * value;
    return sq * sq * value;
}
float getLuminance(vec3 color)
{
return clamp(dot(color, LuminanceEncodeApprox), 0., 1.);
}
float getRand(vec2 seed) {
    return fract(sin(dot(seed.xy ,vec2(12.9898,78.233))) * 43758.5453);
}
float dither(vec2 seed, float varianceAmount) {
    float rand = getRand(seed);
    float dither = mix(-varianceAmount/255.0, varianceAmount/255.0, rand);
    return dither;
}
const float rgbdMaxRange = 255.0;
vec4 toRGBD(vec3 color) {
    float maxRGB = maxEps(max(color.r, max(color.g, color.b)));
    float D      = max(rgbdMaxRange / maxRGB, 1.);
    D            = clamp(floor(D) / 255.0, 0., 1.);
    vec3 rgb = color.rgb * D;
    rgb = toGammaSpace(rgb);
    return vec4(rgb, D);
}
vec3 fromRGBD(vec4 rgbd) {
    rgbd.rgb = toLinearSpace(rgbd.rgb);
    return rgbd.rgb / rgbd.a;
}

layout(location = 0) out vec3 vPositionW;
#define CUSTOM_VERTEX_DEFINITIONS

void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vec3 positionUpdated = position;
#define CUSTOM_VERTEX_UPDATE_POSITION

#define CUSTOM_VERTEX_UPDATE_NORMAL

mat4 finalWorld = world;
vec4 worldPos = finalWorld * vec4(positionUpdated, 1.0);
gl_Position = viewProjection * worldPos;
vPositionW = vec3(worldPos);
vec2 uvUpdated = vec2(0., 0.);
vec2 uv2 = vec2(0., 0.);
#define CUSTOM_VERTEX_MAIN_END

gl_Position.y *= -1.; }