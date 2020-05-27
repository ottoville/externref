#version 450
layout(location = 0) out vec4 glFragColor;
layout(location = 0) in vec4 color;
void main(void) {
    glFragColor = color;
}