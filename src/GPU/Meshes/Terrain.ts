import { BoundableNodeIndexed } from "../../nodes/BoundableNodeIndexed.js";
import type { Scene } from "../../Scene.js";
import type { DrawableIndexed } from "../Drawable.js";
import type { Engine, rust_pointer } from "../../engine.js";
import { TerrainRenderPipeline } from "../RenderPipeLines/Terrain.js";
declare const engine:Engine;
import type { IndexBuffer, VertexBuffer} from "../../GPU/Buffer.js";

export class TerrainMesh extends BoundableNodeIndexed {
    sampler: GPUSampler | undefined;
    setTextureView = (textureview: GPUTextureView) => {
        this.drawable!.setStaticBindGroup('terrainTexture', () => {
            return [{
                binding:0,
                resource: this.sampler!
            }, {
                binding:1,
                resource: textureview
            }]
        });
    }
    drawable: DrawableIndexed | undefined;
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
        public vBuffer: VertexBuffer,
        public iBuffer: IndexBuffer,
        vertices: Float32Array,
        indicesView: Uint32Array,
        verticesPositionStride = 3
    ) {
        super(vertices, verticesPositionStride, indicesView, true, undefined, undefined, true, 'terrain', scenes, undefined, true, false);
        if(engine.gpu) {
            this.sampler = engine.gpu.device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
            });
            this.drawable = engine.gpu.createRenderPipeline(TerrainRenderPipeline).addDrawableIndexed(this, new Set([engine.gpu.renderPassScreen, engine.gpu.renderPassWater, engine.gpu.pickRenderPass]), undefined, 0, 1);
            //@ts-expect-error
            window.debugTerrain=() => this.drawable.debug_render_normals(this);    
            this.drawable!.setStaticBindGroup('TerrainInitialTexture', () => {
                return [{
                    binding:0,
                    resource: this.sampler!
                }, {
                    binding:1,
                    resource: initialTexture
                }]
            });
            this.drawable!.setVertexBuffer(0, this.vBuffer);
            this.drawable!.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
        }
    }
}