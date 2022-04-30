import { BoundableNodeIndexed } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import type { DrawableIndexed } from "../Drawable.js";
import type { Engine, rust_pointer } from "../../engine.js";
import { TerrainRenderPipeline } from "../RenderPipeLines/Terrain.js";
declare const engine:Engine;
import { GPU } from "../../GPU.js";

export class TerrainMesh extends BoundableNodeIndexed {
    sampler = engine.gpu.device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    })
    setTextureView = (textureview: GPUTextureView) => {
        this.drawable.setStaticBuffer(this.sampler, textureview);
    }
    drawable:DrawableIndexed;
    override create_collider(): rust_pointer<"collider"> {
        return engine.rust.create_trimesh_collider(this.ptr);
    }
    override set_indices_and_vertices(indices: Uint32Array, vertices: Float32Array): void {
        super.set_indices_and_vertices(indices, vertices);
        const collider_ptr = this.create_collider();
        engine.rust.add_collider(this.ptr, collider_ptr)
    }
    constructor(
        scenes: Scene[],
        public initialTexture: GPUTextureView,
        public vBuffer: GPUVertexBuffer,
        public iBuffer: GPUIndexBuffer,
        vertices: Float32Array,
        indicesView: Uint32Array,
        verticesPositionStride = 3
    ) {
        super(vertices, verticesPositionStride, indicesView, true, undefined, undefined, true, 'terrain', scenes, undefined, true, false);
        this.drawable = GPU.createRenderPipeline(TerrainRenderPipeline).addDrawableIndexed(this, new Set([engine.gpu.renderPassScreen, engine.gpu.renderPassWater, engine.gpu.pickRenderPass]), undefined, 0, 1);
        //@ts-expect-error
        window.debugTerrain=() => this.drawable.debug_render_normals(this);
        this.drawable.setStaticBuffer(this.sampler, initialTexture);
        this.drawable.setVertexBuffer(0, this.vBuffer);
        this.drawable.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
    }
}