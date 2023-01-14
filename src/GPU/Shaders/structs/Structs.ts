export const MeshUniforms = {
    name: 'MeshUniforms',
    struct: /* wgsl */ `
        transformation : mat4x4<f32>,
        @size(16) color : vec3<f32>,
        @size(12) ambient : vec3<f32>,
        shadow : f32,
        @size(16) spot_light : vec3<f32>,
        id : u32,
        point_light_squared:f32,          //30
        directional_light:f32,
        scenes:u32, //bitmask
        @size(128) z: f32  //padding`
};
export const Scene = {
    name: 'Scene',
    struct: /* wgsl */ `
        modelViewProjection : mat4x4<f32>,
        view : mat4x4<f32>,
        viewPosition : vec3<f32>`
}
export const Time = {
    name: 'Time',
    struct: /* wgsl */ `
        time : u32,
        delta : f32`
}
export const Uniforms = {
    name: 'Uniforms',
    struct: /* wgsl */ `
        screenDimensions : vec2<f32>,
        screendimensions_ratio:vec2<f32>`
}
export const ClusterBounds = {
    name: 'ClusterBounds',
    struct: /* wgsl */ `
        minAABB : vec4<f32>,
        maxAABB : vec4<f32>`
  }
export const Projection = {
    name: 'Projection',
    struct: /* wgsl */ `
        inversed_projection : mat4x4<f32>,
        reversed_projection:mat4x4<f32>,
        projectionFarPlane:mat4x4<f32>,
        zNear : f32,
        zFar : f32,
        z_near_multiplied_far: f32,
        z_near_substracted_far: f32,
        slice_scale:f32,
        slice_bias:f32`
}
export const IntArray = {
    name: 'IntArray',
    struct: /* wgsl */ `
        numbers: array<i32>`
}
export const Plane = {
    name: 'Plane',
    struct: /* wgsl */ `
        norm : vec3<f32>,
        d : f32`
}
export const PlaneArray = {
    name: 'PlaneArray',
    struct: /* wgsl */ `
        plane: array<Plane>`,
    depedencies: [Plane]
}
export const PositionAndRotate = {
    name: 'PositionAndRotate',
    struct: /* wgsl */ `
        position : vec3<f32>,
        rotation : f32`
}
export const PositionAndRotateArray = {
    name: 'PositionAndRotateArray',
    struct: /* wgsl */ `
        arr:  array<PositionAndRotate>`,
    depedencies: [PositionAndRotate]
}
export const FloatArray = {
    name: 'FloatArray',
    struct: /* wgsl */ `
        numbers: array<f32>`
}
export const Vec2Array = {
    name: 'Vec2Array',
    struct: /* wgsl */ `
        vectors: array<vec2<f32>>`
}
export const Slopes = {
    name: 'Slopes',
    struct: /* wgsl */ `
        numbers: array<i32>`
}
export const Settings = {
    name: 'Settings',
    struct: /* wgsl */ `
        size : vec2<u32>,
        bufferSize : vec2<u32>,
        subdivisions : u32,
        heightMinMax : vec2<i32>,
        max : vec2<i32>,
        textureSize: vec2<u32>`
}
export const Vertice = {
    name: 'Vertice',
    struct: /* wgsl */ `
        position : vec3<f32>,
        normals : vec3<f32>,
        @size(16) uv : vec2<f32>`
}
export const Vertices = {
    name: 'Vertices',
    struct: /* wgsl */ `
        vert: array<Vertice>`,
    depedencies: [Vertice]
}
export const Indices = {
    name: 'Indices',
    struct: /* wgsl */ `
        numbers: array<u32>`
}
export const MeshArray = {
    name: 'MeshArray',
    struct: /* wgsl */ `
        length:u32,
        pointers: array<u32, 63>,
        mesh: array<MeshUniforms>`,
    depedencies: [MeshUniforms]
}
export const Lights = {
    name: 'Lights',
    struct: /* wgsl */ `
        length:u32,
        pointers: array<u32>`
}
export const Clusters = {
    name: 'Clusters',
    struct: /* wgsl */ `
        bounds: array<ClusterBounds, 27648>, //32 * 18 * 48 = total tiles = 27648
        lightsCount: array<u32, 27648>,
        lights: array<u32, 1741824>  //27648 * 63 = 1741824`,
    depedencies: [ClusterBounds]
}
export const ViewUniforms = {
    name: 'ViewUniforms',
    struct: /* wgsl */ `
        modelViewProjectionMatrix : mat4x4<f32>,
        view : mat4x4<f32>,
        viewPosition : vec3<f32>`
}
export const Depth_And_Mesh = {
    name: 'Depth_And_Mesh',
    struct: /* wgsl */ `
        depth:f32,
        mesh:u32`
}
export const Mouse = {
    name: 'Mouse',
    struct: /* wgsl */ `
        position:vec2<i32>`
}
export const UIUniforms = {
    name: 'UIUniforms',
    struct: /* wgsl */ `
        translate: vec2<f32>`
}

