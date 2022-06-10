import { Shader, VertexShader } from "../RenderPipeline.js";
import { Engine } from "../../engine.js";
declare const engine:Engine;

export const PlantsRenderPipeline = ['PlantsRenderPipeline',function PlantsRenderPipeline(label:string, primitive: GPUPrimitiveState) {
    if(!engine.gpu)
        return;
    return engine.gpu.rootCameralayout.addRenderPipeline(label,
            new VertexShader(engine.gpu, 'grass/grass.vert.wgsl', [
                {
                    arrayStride: 4 * 4,
                    stepMode: "instance",
                    attributes: [{ // position
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x4"
                    }]
                },
                {
                    arrayStride: 4 * 4,
                    stepMode: "instance",
                    attributes: [
                        {  // shape
                            shaderLocation: 1,
                            offset: 0,
                            format: "float32x4"
                        }
                    ]
                }, {
                    arrayStride: 12,
                    stepMode: 'vertex',
                    attributes: [{
                        // vertex position
                        shaderLocation: 2,
                        offset: 0,
                        format: "float32x3"
                    }]
                }
            ]),
            new Shader(engine.gpu, 'color.frag.wgsl'), {
            primitive
        })
    }] as const