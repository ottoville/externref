import type { GPU } from "../../GPU";
import { createGroundVertShader } from "../Shaders/Ground.vert.js";
import { GroundFragShader } from "../Shaders/Ground.frag.js";

const attributes = Object.freeze(
    {
        position: {
            shaderLocation: 0,
            offset: 0,
            format: "float32x3",
            shaderFormat: "vec3<f32>"
        },
        normal: {
            shaderLocation: 1,
            offset: 16,
            format: "float32x3",
            shaderFormat: "vec3<f32>"
        },
        uv: {
            shaderLocation: 2,
            offset: 32,
            format: "float32x2",
            shaderFormat: "vec2<f32>"
        }
    } as const
)

export const TerrainRenderPipeline = [
    'TerrainRenderPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: {
        stride: number;
    }) {
        const groundVertShader = createGroundVertShader(gpu.lightsTextureBindGroup,
            {
                arrayStride: vertexBufferProps.stride * 4,
                stepMode: "vertex",
                attributes2: attributes
            }

        );
        return gpu.lightsTextureBindGroup.addRenderPipeline(
            {
                label,
                vertexShader: groundVertShader,
                fragmentShader: new GroundFragShader(gpu.lightsTextureBindGroup),
                renderPipeline: {
                    primitive
                }
            });
    }
] as const