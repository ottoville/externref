export const positionAttr = Object.freeze({
  position: {
    format: 'float32x3',
    offset: 0,
    shaderFormat: 'vec4<f32>',
    shaderLocation: 0,
  },
} as const);
export const simpleAttributes = Object.freeze({
  ...positionAttr,
  normal: {
    format: 'float32x3',
    offset: 16,
    shaderFormat: 'vec3<f32>',
    shaderLocation: 1,
  },
} as const);
