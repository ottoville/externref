#version 450
precision highp float;

layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
};

layout(location = 0) in vec4 positions;  // {xyz} (blade's position) + rotation
layout(location = 1) in vec4 shape;  // {x:width, y:height, z:lean, w:curve} (blade's shape properties)
layout(location = 2) in vec2 vertices; 

// Rotate by an angle //Todo: move to baking shader?
vec2 rotate (float x, float y, float r) {
	float c = cos(r);
	float s = sin(r);
	return vec2(x * c - y * s, x * s + y * c);
}
void main(void) {
    vec2 rotated=rotate(0, vertices.x, positions.w);
    vec4 worldPos = vec4(positions.xyz, 1.0) + vec4(rotated.x, vertices.y, rotated.y, 0.0);
    gl_Position = viewProjection * worldPos;
    gl_Position.y *= -1.;
}