import { GPU } from "../../GPU.js";
import { createGrassVertShader, positionAttr, shapeAttr, vertexPositionAttr } from "../Shaders/Grass.vert.js";
import { createColorFragmentShader } from "../Shaders/Color.frag.js";


export const PlantsRenderPipeline = [
    'PlantsRenderPipeline', function PlantsRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: { stride: number }) {
        const grassVertShader = createGrassVertShader(gpu.rootCameralayout, [
            {
                arrayStride: vertexBufferProps.stride * 4,
                stepMode: "instance",
                attributes2: positionAttr
            },
            {
                arrayStride: 4 * 4,
                stepMode: "instance",
                attributes2: shapeAttr
            }, {
                arrayStride: 8,
                stepMode: 'vertex',
                attributes2: vertexPositionAttr
            }
        ]);
        return gpu.rootCameralayout.addRenderPipeline(
            {
                label,
                vertexShader: grassVertShader,
                fragmentShader: createColorFragmentShader(gpu.rootCameralayout),
                renderPipeline: {
                    primitive
                }
            })
    }
] as const