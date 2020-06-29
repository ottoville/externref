import { Drawable, DrawableLikeClass } from "./Drawable";
import { GPUScene } from "../GPUScene";

export const Mesh: DrawableLikeClass = class extends Drawable {
    static Layouts: Map<GPUScene, GPUPipelineLayout> = new Map();
    static createLayout(scene: GPUScene) {
        return scene.device.createPipelineLayout({
            bindGroupLayouts: [scene.uniformBindGroupLayout]
        })
    }
    static Meshes: Set<Drawable> = new Set();
    constructor(renderPipeline: GPURenderPipelineDescriptor, bindGroups: null, indexOrVertexCount: number, instanceCount = 1, firstInstance = 0, firstVertexOrIndex = 0, gpuscene: GPUScene = GPUScene.instance) {
        if (!renderPipeline.rasterizationState) {
            renderPipeline.rasterizationState = {
                cullMode: 'front',
            }
        }
        super(renderPipeline, null, indexOrVertexCount, instanceCount, firstInstance, firstVertexOrIndex, gpuscene, Mesh);
        Mesh.Meshes.add(this);
    }
}