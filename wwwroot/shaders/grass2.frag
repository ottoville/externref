#version 300 es
#ifdef GL_ES
    precision highp float;
#endif

in vec2 vUV;
in vec4 vColor;
in vec3 vNormal;

uniform float fogNear;
uniform float fogFar;
uniform vec3 fogColor;
uniform float grassFogFar;
//uniform sampler2D map;
uniform vec3 lightPos;

uniform vec3 camDir; // direction cam is looking at

out vec4 myOutputColor;

void main(void) {
    //FIX
    vec4 color = vec4(vColor);//  texture(map, vUV);
    //gl_FragColor = vec4(vColor);
  //FIX
	//vec4 hdata = texture2D(heightMap, vSamplePos);
    float depth = gl_FragCoord.z / gl_FragCoord.w;

	// make grass transparent as it approachs outer view distance perimeter
	//color.a = 1.0 - smoothstep(grassFogFar * 0.55, grassFogFar * 0.8, depth);
	color.a = 1.0;
    // apply terrain lightmap
    float light=0.7;
    //float light = ( 1.7 + cos(vSamplePos.x*0.01)) * 0.27;
	//float light = hdata.g;

	color.r *= light;
	color.g *= light;
	color.b *= light;

	// then apply atmosphere fog
	float fogFactor = smoothstep(fogNear, fogFar, depth);
	color.rgb = mix(color.rgb, fogColor, fogFactor);
    myOutputColor = color;


    // World values
  /*  vec3 vPositionW = vec3(mat4(world0, world1, world2, world3) * vec4(worldPos, 1.0));
    vec3 vNormalW = normalize(vec3(world * vec4(vNormal, 0.0)));
    vec3 viewDirectionW = normalize(camDir - vPositionW);

    // Light
    vec3 lightVectorW = normalize(lightPos - vPositionW);
    vec3 color = texture2D(map, vUV).rgb;

    // diffuse
    float ndl = max(0., dot(vNormalW, lightVectorW));

    // Specular
    vec3 angleW = normalize(viewDirectionW + lightVectorW);
    float specComp = max(0., dot(vNormalW, angleW));
    specComp = pow(specComp, max(1., 64.)) * 2.;
    vec4 color2=vec4(color * ndl + vec3(specComp), 1.);
    gl_FragColor = vec4(clamp(color2,0.2,0.8))*vec4(0.45, 0.46, 0.19,1.0);*/
   //gl_FragColor = texture2D(map, vUV)*vec4(0.45, 0.46, 0.19,1.0);
}