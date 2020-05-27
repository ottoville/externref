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
const float[7] seqments = float[7](0,0,0.2,0.2,0.5,0.5,1);


layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
};

layout(location = 0) in vec4 positions;  // {xyz} (blade's position) + rotation
layout(location = 1) in vec4 shape;  // {x:scale, y:lean, z:curve} (blade's shape properties)

layout(location = 0) out vec4 color;

// Rotate by an angle //Todo: move to baking shader?
vec2 rotate (float x, float y, float r) {
	float c = cos(r);
	float s = sin(r);
	return vec2(x * c - y * s, x * s + y * c);
}
void main(void) {
    vec2 vertice=vertices[gl_VertexIndex];
    float seqment=seqments[gl_VertexIndex];


    //float curved = seqment*shape.z;
    float curved = seqment*shape.z;

    //vec2 curved2 = rotate(vertice.y,0, seqment*shape.z);
    float angle=seqment*shape.z;
    vec2 curved2 = vec2(vertice.y * cos(angle), vertice.y * sin(angle));




    //vec3 scaled=vec3(shape.x*vertice.x, shape.x*vertice.y, shape.x*curved);
    vec3 scaled=vec3(shape.x*vertice.x, shape.x*curved2.x, shape.x*curved2.y);

    vec2 rotated=rotate(scaled.z, scaled.x, positions.w);
    
    vec4 worldPos = vec4(positions.xyz, 1.0) + vec4(rotated.x, scaled.y, rotated.y, 0.0);
    gl_Position = viewProjection * worldPos;
    gl_Position.y *= -1.;
    color=vec4(0.3,1.0,0.0,0.9);
}