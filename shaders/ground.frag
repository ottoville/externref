#version 300 es
#ifdef GL_ES
    precision highp float;
#endif

in vec3 vPosition;
in vec3 vNormal;
in vec2 vUV;
out vec4 outputColor;

uniform sampler2D textureSampler2;
uniform sampler2D heightMap;
uniform mat4 world;
uniform vec3 lightPos;
uniform vec3 cameraPosition;

void main(void) {
    float specularStrength = 0.2;

    //https://cyos.babylonjs.com/#1HF00B
    //https://learnopengl.com/Lighting/Basic-Lighting
    vec3 vPositionW = vec3(world * vec4(vPosition, 1.0));
    vec3 vNormalW = normalize(vec3(world * vec4(vNormal, 0.0)));

    

    //light //ambient
    vec3 color = texture(textureSampler2, vUV).rgb *0.8;
    //vec3 color = vec3(0.5,0.5,0.5);


    // diffuse
    vec3 lightVectorW = normalize(lightPos - vPositionW);
    float diffuse = max(0., dot(vNormalW, lightVectorW));

    // Specular
    vec3 norm = normalize(vNormalW);
    vec3 viewDirectionW = normalize(cameraPosition - vPositionW);
    vec3 reflectDir = reflect(-lightVectorW, norm);  
    float mmax=max(dot(viewDirectionW, reflectDir), 0.0);
    float spec = pow(mmax, 32.0) * specularStrength;

    outputColor=  vec4(color * (diffuse + vec3(spec)), 1.);//texture(textureSampler2, vUV);

}