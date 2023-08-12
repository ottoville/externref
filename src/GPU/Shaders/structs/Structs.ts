/* eslint-disable sort-keys */
import { BufLayout, ShaderStage } from '../../BindGroupLayout.js';

export class Struct<const T extends { [index: string]: readonly [properties: string, type: string] } = { [index: string]: readonly [size: string, type: string] }> {
    constructor(public name: string, public properties: T, public depedencies?: Struct[]) {

    }
    getPropertiesAsString() {
        let properties = '';
        for (const property in this.properties) {
            properties += `${this.properties[property]![0]} ${property}: ${this.properties[property]![1]},\n`;
        }
        return properties;
    }
}

export const typicalOutput = new Struct('Output',
    {
        fragCoord: [
            '@builtin(position)',
            'vec4<f32>'
        ],
        normal: [
            '@location(0)',
            'vec3<f32>'
        ],
        id: [
            '@location(1) @interpolate(flat)',
            'u32'
        ],
        color: [
            '@location(2)',
            'vec3<f32>'
        ],
        position: [
            '@location(3)',
            'vec3<f32>'
        ],
        scenes: [
            '@location(4) @interpolate(flat)',
            'u32'
        ],
    });



export const pickOutput = new Struct('PickOutput',
    {
        Position: [
            '@builtin(position)',
            'vec4<f32>'
        ],
        id: [
            '@location(0) @interpolate(flat)',
            'u32'
        ],
    });
export const pickOutputFragment = new Struct('PickOutput',
    {
        ID: [
            '@location(0)',
            'u32'
        ],
    });
export const colorPositionOutput = new Struct('Output',
    {
        position: [
            '@builtin(position)',
            'vec4<f32>'
        ],
        color: [
            '@location(0)',
            'vec3<f32>'
        ],
    });
export const diffuseOutput = new Struct('Output',
    {
        Diffuse: [
            '@location(0)',
            'vec4<f32>'
        ],
    });

export const MeshUniforms = new Struct('MeshUniforms',
    {
        transformation: [
            '',
            'mat4x4<f32>'
        ],
        color: [
            '@size(16)',
            'vec3<f32>'
        ],
        ambient: [
            '@size(12)',
            'vec3<f32>'
        ],
        shadow: [
            '',
            'f32'
        ],
        spot_light: [
            '@size(16)',
            'vec3<f32>'
        ],
        id: [
            '',
            'u32'
        ],
        point_light_squared: [
            '',
            'f32'
        ],          //30
        directional_light: [
            '',
            'f32'
        ],
        scenes: [
            '',
            'u32'
        ], //bitmask
        z: [
            '@size(128)',
            'f32'
        ],  //padding`
    });
export const Scene = new Struct('Scene',
    {
        modelViewProjection: [
            '',
            'mat4x4<f32>'
        ],
        view: [
            '',
            'mat4x4<f32>'
        ],
        viewPosition: [
            '',
            'vec3<f32>'
        ],
    });
export const Time = new Struct('Time',
    {
        time: [
            '',
            'u32'
        ],
        delta: [
            '',
            'f32'
        ],
    });
export const ScreenDimensions = new Struct('Screen_Dimensions',
    {
        screenDimensions: [
            '',
            'vec2<f32>'
        ],
        screendimensions_ratio: [
            '',
            'vec2<f32>'
        ],
    });
export const ClusterBounds = new Struct('ClusterBounds',
    {
        minAABB: [
            '',
            'vec4<f32>'
        ],
        maxAABB: [
            '',
            'vec4<f32>'
        ],
    });
export const ProjectionStruct = new Struct('Projection',
    {
        inversed_projection: [
            '',
            'mat4x4<f32>'
        ],
        reversed_projection: [
            '',
            'mat4x4<f32>'
        ],
        projectionFarPlane: [
            '',
            'mat4x4<f32>'
        ],
        zNear: [
            '',
            'f32'
        ],
        zFar: [
            '',
            'f32'
        ],
        z_near_multiplied_far: [
            '',
            'f32'
        ],
        z_near_substracted_far: [
            '',
            'f32'
        ],
        slice_scale: [
            '',
            'f32'
        ],
        slice_bias: [
            '',
            'f32'
        ],
    });
export const IntArray = new Struct('IntArray',
    {
        numbers: [
            '',
            'array<i32>'
        ],
    });
export const Plane = new Struct('Plane',
    {
        norm: [
            '',
            'vec3<f32>'
        ],
        d: [
            '',
            'f32'
        ],
    });
export const PlaneArray = new Struct('PlaneArray',
    {
        plane: [
            '',
            'array<Plane>'
        ],
    },
    [Plane]);
export const PositionAndRotate = new Struct('PositionAndRotate',
    {
        position: [
            '',
            'vec3<f32>'
        ],
        rotation: [
            '',
            'f32'
        ],
    });
export const PositionAndRotateArray = new Struct('PositionAndRotateArray',
    {
        arr: [
            '',
            'array<PositionAndRotate>'
        ],
    },
    [PositionAndRotate]);
export const FloatArray = new Struct('FloatArray',
    {
        numbers: [
            '',
            'array<f32>'
        ],
    });
export const Vec2Array = new Struct('Vec2Array',
    {
        vectors: [
            '',
            'array<vec2<f32>>'
        ],
    });
export const Vertice = new Struct('Vertice',
    {
        position: [
            '',
            'vec3<f32>'
        ],
        normal: [
            '',
            'vec3<f32>'
        ],
        uv: [
            '@size(16)',
            'vec2<f32>'
        ],
    });
export const UI_Input = new Struct('Output',
    {
        Position: [
            '@builtin(position)',
            'vec4<f32>'
        ],
        v_uv: [
            '@location(0)',
            'vec2<f32>'
        ],
    });
export const WaterInput = new Struct('Output',
    {
        Position: [
            '@builtin(position)',
            'vec4<f32>'
        ],
        v_uv: [
            '@location(0)',
            'vec4<f32>'
        ],
        position: [
            '@location(1)',
            'vec3<f32>'
        ],
        id: [
            '@location(2) @interpolate(flat)',
            'u32'
        ],
    });
export const GroundInput = new Struct('Output',
    {
        fragCoord: [
            '@builtin(position)',
            'vec4<f32>'
        ],
        v_uv: [
            '@location(0)',
            'vec2<f32>'
        ],
        normal: [
            '@location(1)',
            'vec3<f32>'
        ],
        position: [
            '@location(2)',
            'vec3<f32>'
        ],
        id: [
            '@location(3) @interpolate(flat)',
            'u32'
        ],
        scenes: [
            '@location(4) @interpolate(flat)',
            'u32'
        ],
    }) ;
export const Vertices = new Struct('Vertices',
    {
        vert: [
            '',
            'array<Vertice>'
        ],
    },
    [Vertice]
);
export const Indices = new Struct('Indices',
    {
        numbers: [
            '',
            'array<u32>'
        ],
    });
export const MeshArray = new Struct('MeshArray',
    {
        mesh: [
            '',
            'array<MeshUniforms>'
        ],
    },
    [MeshUniforms]
);
export const Lights = new Struct('Lights',
    {
        length: [
            '',
            'u32'
        ],
        pointers: [
            '',
            'array<u32>'
        ],
    });
export const Clusters = new Struct('Clusters',
    {
        bounds: [
            '',
            'array<ClusterBounds, 27648>'
        ], //32 * 18 * 48 = total tiles = 27648
        lightsCount: [
            '',
            'array<u32, 27648>'
        ],
        lights: [
            '',
            'array<u32, 1741824>'
        ],  //27648 * 63 = 1741824`,
    },
    [ClusterBounds]
);
export const UpdateClustersBufferLayout = new BufLayout(
    {
        visibility: ShaderStage.COMPUTE,
        buffer: {
            type: 'storage',
            hasDynamicOffset: false,
            minBindingSize: 7962624,
        },
    },
    Clusters);
export const ViewUniforms = new Struct('ViewUniforms',
    {
        modelViewProjectionMatrix: [
            '',
            'mat4x4<f32>'
        ],
        view: [
            '',
            'mat4x4<f32>'
        ],
        viewPosition: [
            '',
            'vec3<f32>'
        ],
    });
export const Depth_And_Mesh = new Struct('Depth_And_Mesh',
    {
        depth: [
            '',
            'f32'
        ],
        mesh: [
            '',
            'u32'
        ],
    });
export const Mouse = new Struct('Mouse',
    {
        position: [
            '',
            'vec2<i32>'
        ],
    });
export const UIUniforms = new Struct('UIUniforms',
    {
        translate: [
            '',
            'vec2<f32>'
        ],
    });
