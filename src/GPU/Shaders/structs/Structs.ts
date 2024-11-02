/* eslint-disable sort-keys */

import { Struct, StructProperty } from '../../../webgpu-ts/index.js';
export const tileCount = [32, 18, 48] as const;

const fragCoord = new StructProperty('@builtin(position)', 'vec4<f32>');

export const typicalOutput = new Struct('Output', {
  fragCoord,
  normal: new StructProperty('@location(0)', 'vec3<f32>'),
  id: new StructProperty('@location(1) @interpolate(flat)', 'u32'),
  color: new StructProperty('@location(2)', 'vec3<f32>'),
  position: new StructProperty('@location(3)', 'vec3<f32>'),
  scenes: new StructProperty('@location(4) @interpolate(flat)', 'u32'),
});
export const GroundInput = new Struct('Output', {
  fragCoord,
  normal: new StructProperty('@location(0)', 'vec3<f32>'),
  id: new StructProperty('@location(1) @interpolate(flat)', 'u32'),
  v_uv: new StructProperty('@location(2)', 'vec2<f32>'),
  position: new StructProperty('@location(3)', 'vec3<f32>'),
  scenes: new StructProperty('@location(4) @interpolate(flat)', 'u32'),
});
export const fragOutput = new Struct('Output', {
  fragCoord,
});
export const pickOutput = new Struct('PickOutput', {
  fragCoord,
  id: new StructProperty('@location(0) @interpolate(flat)', 'u32'),
});
export const pickOutputFragment = new Struct('PickOutput', {
  ID: new StructProperty('@location(0)', 'u32'),
});
export const colorPositionOutput = new Struct('Output', {
  fragCoord,
  color: new StructProperty('@location(0)', 'vec3<f32>'),
});
export const diffuseOutput = new Struct('Output', {
  Diffuse: new StructProperty('@location(0)', 'vec4<f32>'),
});
export const Scene = new Struct('Scene', {
  modelViewProjection: new StructProperty('', 'mat4x4<f32>'),
  view: new StructProperty('', 'mat4x4<f32>'),
  viewPosition: new StructProperty('', 'vec3<f32>'),
});
export const Time = new Struct('Time', {
  time: new StructProperty('', 'u32'),
  delta: new StructProperty('', 'f32'),
});

const vec2f32 = new StructProperty('', 'vec2<f32>');

export const ScreenDimensions = new Struct('Screen_Dimensions', {
  screenDimensions: vec2f32,
  screendimensions_ratio: vec2f32,
});
const ClusterBounds = new Struct('ClusterBounds', {
  minAABB: new StructProperty('', 'vec4<f32>'),
  maxAABB: new StructProperty('', 'vec4<f32>'),
});
export const ProjectionStruct = new Struct('Projection', {
  inversed_projection: new StructProperty('', 'mat4x4<f32>'),
  reversed_projection: new StructProperty('', 'mat4x4<f32>'),
  projectionFarPlane: new StructProperty('', 'mat4x4<f32>'),
  zNear: new StructProperty('', 'f32'),
  zFar: new StructProperty('', 'f32'),
  z_near_multiplied_far: new StructProperty('', 'f32'),
  z_near_substracted_far: new StructProperty('', 'f32'),
  slice_scale: new StructProperty('', 'f32'),
  slice_bias: new StructProperty('', 'f32'),
});
export const IntArray = new Struct('IntArray', {
  numbers: new StructProperty('', 'array<i32>'),
});
const Plane = new Struct('Plane', {
  norm: new StructProperty('', 'vec3<f32>'),
  d: new StructProperty('', 'f32'),
});
export const PlaneArray = new Struct(
  'PlaneArray',
  {
    plane: new StructProperty('', 'array<Plane>'),
  },
  [Plane],
);
export const PositionAndRotate = new Struct('PositionAndRotate', {
  position: new StructProperty('', 'vec3<f32>'),
  rotation: new StructProperty('', 'f32'),
});
export const FloatArray = new Struct('FloatArray', {
  numbers: new StructProperty('', 'array<f32>'),
});
export const float2f32 = new Struct('float2f32', {
  numbers: vec2f32,
});
export const float4f32 = new Struct('FloatArray', {
  numbers: new StructProperty('', 'vec4<f32>'),
});
export const Vec2Array = new Struct('Vec2Array', {
  vectors: new StructProperty('', 'array<vec2<f32>>'),
});

export const Vec4Array = new Struct('Vec4Array', {
  vectors: new StructProperty('', 'array<vec4<f32>>'),
});
export const PositionOutput = new Struct('Output', {
  fragCoord,
});
export const UI_Input = new Struct('Output', {
  fragCoord,
  v_uv: new StructProperty('@location(0)', 'vec2<f32>'),
});
export const WaterInput = new Struct('Output', {
  fragCoord,
  v_uv: new StructProperty('@location(0)', 'vec4<f32>'),
  position: new StructProperty('@location(1)', 'vec4<f32>'),
  id: new StructProperty('@location(2) @interpolate(flat)', 'u32'),
});

const vertexPosition = new StructProperty(
  '@size(16)',
  'vec3<f32>',
  'vec4<f32>',
);
const vertexNormal = new StructProperty('@size(16)', 'vec3<f32>');
export const PositionVertice = new Struct('Vertice', {
  position: vertexPosition,
});
export const PositionNormalVertice = new Struct('PositionNormalVertice', {
  position: vertexPosition,
  normal: vertexNormal,
});
export const PositionUvVertice = new Struct('PositionUvVertice', {
  position: vec2f32,
  uv: vec2f32,
});
export const PositionNormalUvVertice = new Struct('PositionNormalUvVertice', {
  position: vertexPosition,
  normal: vertexNormal,
  uv: new StructProperty('@size(16)', 'vec2<f32>'),
});
export const PositionNormalColorVertice = new Struct(
  'PositionNormalColorVertice',
  {
    position: vertexPosition,
    normal: vertexNormal,
    color: new StructProperty('@size(16)', 'vec3<f32>'),
  },
);
export const PositionNormalUvVertices = new Struct(
  'PositionNormalUvVertices',
  {
    vert: new StructProperty('', 'array<PositionNormalUvVertice>'),
  },
  [PositionNormalUvVertice],
);
const arr_u32 = new StructProperty('', 'array<u32>');
export const U32Arr = new Struct('u32arr', {
  numbers: arr_u32,
});

export const Lights = new Struct('Lights', {
  length: new StructProperty('', 'u32'),
  pointers: arr_u32,
});
export const Clusters = new Struct(
  'Clusters',
  {
    bounds: new StructProperty(
      '',
      `array<ClusterBounds, ${tileCount[0] * tileCount[1] * tileCount[2]}>`,
    ), //32 * 18 * 48 = total tiles = 27648
    lightsCount: new StructProperty('', 'array<u32, 27648>'),
    lights: new StructProperty(
      '',
      `array<u32, ${tileCount[0] * tileCount[1] * tileCount[2] * 63}>`,
    ), //27648 * 63 = 1741824`,
  },
  [ClusterBounds],
);

export const ViewUniforms = new Struct('ViewUniforms', {
  modelViewProjectionMatrix: new StructProperty('', 'mat4x4<f32>'),
  view: new StructProperty('', 'mat4x4<f32>'),
  viewPosition: new StructProperty('', 'vec3<f32>'),
});
export const Depth_And_Mesh = new Struct('Depth_And_Mesh', {
  depth: new StructProperty('', 'f32'),
  mesh: new StructProperty('', 'u32'),
});
export const Mouse = new Struct('Mouse', {
  position: new StructProperty('', 'vec2<i32>'),
});
