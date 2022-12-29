import { BoundableNodeIndexed } from "../../nodes/BoundableNodeIndexed.js";
import type { Scene } from "../../Scene.js";
import { DrawableIndexed } from "../Drawables/DrawableIndexed.js";
import type { Engine, rust_pointer } from "../../engine.js";
import { TerrainRenderPipeline } from "../RenderPipeLines/Terrain.js";
declare const engine:Engine;
import type { IndexBuffer, VertexBuffer} from "../../GPU/Buffer/Buffer.js";
import { VertexShader } from "GPU/RenderPipeline.js";
import { NormalsMesh } from "./helpers/normals.js";
import { TextureView } from "GPU/TextureView.js";
import type { RenderPipeline } from "../RenderPipeline.js";

export class TerrainMesh extends BoundableNodeIndexed {
    sampler: GPUSampler | undefined;
    setTextureView = (textureview: TextureView) => {
        this.drawable!.setStaticBindGroup('terrainTexture', (bindGroup) => {
            return [{
                binding:0,
                resource: this.sampler!
            }, {
                binding:1,
                resource: textureview.getTextureBinding(bindGroup)
            }]
        });
    }
    drawable: DrawableIndexed<RenderPipeline<VertexShader<[{
        arrayStride: number;
        stepMode: "vertex";
        attributes: ({
            shaderLocation: number;
            offset: number;
            format: "float32x3";
        } | {
            shaderLocation: number;
            offset: number;
            format: "float32x2";
        })[];
    }]>>> | undefined;
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
        public initialTexture: TextureView,
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
            const renderPipeline = engine.gpu.createRenderPipeline(TerrainRenderPipeline);
            this.drawable = new DrawableIndexed({
                renderPipeline,
                renderPasses: new Set([engine.gpu.renderPassScreen, engine.gpu.renderPassWater, engine.gpu.pickRenderPass]),
                node: this,
                vertexBuffers: [this.vBuffer]
            })
            //@ts-expect-error
            window.debugTerrain=() => new NormalsMesh(this.drawable);

            this.drawable.setStaticBindGroup('TerrainInitialTexture', (bindGroup) => {
                return [{
                    binding:0,
                    resource: this.sampler!
                }, {
                    binding:1,
                    resource: initialTexture.getTextureBinding(bindGroup)
                }]
            });
            this.drawable.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
        }
    }
}