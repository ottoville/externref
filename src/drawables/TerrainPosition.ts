import { Drawable, DrawableLikeClass } from "./Drawable";
import { GPUScene } from "../GPUScene";
import { Terrain } from "../world/terrain";
import { worldPosition } from "../traits/worldPosition";

export const TerrainPositionDrawable: DrawableLikeClass = class  extends Drawable {
    static Layouts: Map<GPUScene, GPUPipelineLayout> = new Map();
    static createLayout(scene: GPUScene) {
        return scene.device.createPipelineLayout({
            bindGroupLayouts: [scene.uniformBindGroupLayout, Terrain.getHeightsLayout(scene), worldPosition.getLayout(scene)]
        })
    }
    static Meshes: Set<Drawable> = new Set();
    constructor(renderPipeline: GPURenderPipelineDescriptor, bindGroups: [GPUBindGroup], indexOrVertexCount: number, instanceCount = 1, firstInstance = 0, firstVertexOrIndex = 0, gpuscene: GPUScene = GPUScene.instance) {
        super(renderPipeline, bindGroups, indexOrVertexCount, instanceCount, firstInstance, firstVertexOrIndex, gpuscene, TerrainPositionDrawable);
        TerrainPositionDrawable.Meshes.add(this);
    }
}