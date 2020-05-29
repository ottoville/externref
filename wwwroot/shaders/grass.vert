#version 450
precision highp float;

const vec2 vertices[7] = vec2[7](
            vec2(0.02f,    0),
            vec2(-0.02f,   0) ,
            vec2(0.014f,    0.29f),
            vec2(-0.014f,   0.29f),
            vec2(0.007f,    0.57f),
            vec2(-0.007f,   0.57f), 
            vec2(0,      1.0f)
           );

const float[7] bending = float[7](0,0,0.2,0.2,0.5,0.5,1.0);
const int[7] rot = int[7](0,0,1,1,1,1,1);

//const float[7] color = float[7](0.2,0.3,0.1,0.2,0.4,0.1,0.3);


layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
};
layout(set = 1, binding = 0) uniform Terra {
   float time;
} terra;


layout(location = 0) in vec4 positions;  // {xyz} (blade's position) + rotation
layout(location = 1) in vec4 shape;  // {x:scale, y:lean, z:curve, w:color} (blade's shape properties)

layout(location = 0) out vec4 color;



// Rotate by an angle //Todo: move to baking shader?
vec2 rotate (float x, float y, float r) {
	float c = cos(r);
	float s = sin(r);
	return vec2(x * c - y * s, x * s + y * c);
}
void main(void) {
    vec3 vertice=vec3(vertices[gl_VertexIndex].xy,0);
    float bend=bending[gl_VertexIndex];


    //vec2 curved2 = rotate(vertice.y,0, seqment*shape.z);

   // float windIntensivy=cos(terra.time);
    float windIntensivy=1.0;
    float windDirection=cos(terra.time*0.5);

    // vec2 rotatedXZ= vec2(vertice.x * cos(positions.w), vertice.x * sin(positions.w));
     vec2 rotatedXZ= vec2(vertice.x * cos(1), vertice.x * sin(1));
                            // vec2 rotatedXZ=rotate(vertice.x, vertice.z, positions.w);
     vec3 rotated=vec3(rotatedXZ.x, vertice.y, rotatedXZ.y);


    float angle=bend*shape.z*windIntensivy;
    //float angle=bend*windIntensivy;
                                                            //at this point vertice.z is 0
                    //vec3 curved2 = vec3(vertice.x, vertice.y * cos(angle), vertice.y * sin(angle));
    vec2 curvedXY = rotate(rotated.x, rotated.y, angle);
    
    vec3 curved = vec3(curvedXY.x, curvedXY.y, rotated.z);

                    //vec3 windrotate = vec3(curved2.x * cos(windDirection), curved2.y, curved2.z * sin(windDirection));

                        //vec3 scaled=vec3(shape.x*vertice.x, shape.x*vertice.y, shape.x*curved);
    //vec3 scaled=shape.x*curved;
    vec3 scaled=curved;

    
    vec4 worldPos = vec4(positions.xyz, 1.0) + vec4(scaled.x, scaled.y, scaled.z, 0.0);
    gl_Position = viewProjection * worldPos;
    gl_Position.y *= -1.;
    color=vec4(
    shape.w
    ,1.0,0.0,0.9);
}