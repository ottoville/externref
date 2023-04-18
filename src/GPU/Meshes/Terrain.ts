import { BoundableNodeIndexed } from "../../nodes/BoundableNodeIndexed.js";
import type { Scene } from "../../Scene.js";
import { DrawableIndexed } from "../Drawables/DrawableIndexed.js";
import type { Engine, rust_pointer } from "../../engine.js";
import { TerrainRenderPipeline } from "../RenderPipeLines/Terrain.js";
declare const engine: Engine;
import type { IndexBuffer, VertexBuffer } from "../../GPU/Buffer/Buffer.js";
import type { TextureView } from "../TextureView.js";
import type { GroundVertShader } from "../Shaders/Ground.vert.js";
import type { RenderPipeline } from "../RenderPipeline.js";

export class TerrainMesh extends BoundableNodeIndexed {
    sampler: GPUSampler | undefined;
    setTextureView = (textureview: TextureView) => {
        this.drawable!.setStaticBindGroup('terrainTexture', (bindGroup) => {
            return [
                {
                    binding: 0,
                    resource: this.sampler!
                }, {
                    binding: 1,
                    resource: textureview.getTextureBinding(bindGroup)
                }
            ]
        });
    }
    drawable: DrawableIndexed<RenderPipeline<GroundVertShader>> | undefined;
    override create_collider(): rust_pointer<"collider"> {
        return engine.rust.create_trimesh_collider(this.id);
    }
    override set_indices_and_vertices(indices: Uint32Array, vertices: Float32Array): void {
        super.set_indices_and_vertices(indices, vertices);
        const collider_ptr = this.create_collider();
        engine.rust.add_collider(this.id, collider_ptr)
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
        super(
            {
                vertices: {
                    view: vertices,
                    stride: verticesPositionStride
                },
                can_collide: true,
                static_faces: true

            },
            {
                label: 'terrain',
                scenes,
                fixed: true,
                rigid_body: false
            },
            indicesView
        );
        if (engine.gpu) {
            this.sampler = engine.gpu.device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
            });
            const renderPipeline = engine.gpu.createRenderPipeline(TerrainRenderPipeline);
            this.drawable = new DrawableIndexed({
                renderPipeline,
                renderPasses: new Set([engine.gpu.renderPassScreen, engine.gpu.renderPassWater, engine.gpu.pickRenderPass]),
                vertexBuffers: [this.vBuffer],
                node: this,
            })

            this.drawable.setStaticBindGroup('TerrainInitialTexture', (bindGroup) => {
                return [
                    {
                        binding: 0,
                        resource: this.sampler!
                    }, {
                        binding: 1,
                        resource: initialTexture.getTextureBinding(bindGroup)
                    }
                ]
            });
            this.drawable.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
        }
    }
}