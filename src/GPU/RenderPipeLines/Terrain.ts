import type { GPU } from "../../GPU";
import { GroundVertShader } from "../Shaders/Ground.vert.js";
import { GroundFragShader } from "../Shaders/Ground.frag.js";


export const TerrainRenderPipeline = [
    'TerrainRenderPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
        const groundVertShader = new GroundVertShader(gpu.lightsBindGroupTexture2,
            {
                arrayStride: 48,
                stepMode: "vertex",
                attributes: [
                    {
                        // position
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    },
                    {
                        // normals
                        shaderLocation: 2,
                        offset: 16,
                        format: "float32x3"
                    },
                    {
                        // uv
                        shaderLocation: 1,
                        offset: 32,
                        format: "float32x2"
                    }
                ]
            }

        );
        return gpu.lightsBindGroupTexture2.addRenderPipeline(
            {
                label,
                vertexShader: groundVertShader,
                fragmentShader: new GroundFragShader(gpu.lightsBindGroupTexture2),
                renderPipeline: {
                    primitive
                }
            });
    }
] as const