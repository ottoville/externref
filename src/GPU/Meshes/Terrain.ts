import { BoundableNodeIndexed } from '../../nodes/BoundableNodeIndexed.js';
import type { Scene } from '../../Scene.js';
import { DrawableIndexed } from '../Drawables/DrawableIndexed.js';
import type { Engine, rust_pointer, rust_vec_ptr } from '../../engine.js';
import { TerrainRenderPipeline } from '../RenderPipeLines/Terrain.js';
declare const engine: Engine;
import type { IndexBuffer, VertexBuffer } from '../../GPU/Buffer/Buffer.js';
import type { TextureView } from '../TextureView.js';
import type { GroundVertShader } from '../Shaders/Ground.vert.js';
import type { RenderPipeline } from '../RenderPipeline.js';
import { new_rust_mesh } from '../../MainNode.js';
import type { TEXTURE_BINDING_SRC_TEXTURE, Texture } from '../../GPU/Texture.js';

export class TerrainMesh extends BoundableNodeIndexed {
    sampler: GPUSampler | undefined;
    setTextureView = (textureview: TextureView<Texture<GPUTextureFormat, TEXTURE_BINDING_SRC_TEXTURE>>) => {
        this.drawable!.setStaticBindGroup('terrainTexture',
            (bindGroup) => {
                return ({
                    todo1: {
                        binding: 0,
                        resource: this.sampler!,
                    },
                    todo2: {
                        binding: 1,
                        resource: textureview.getTextureBinding(bindGroup),
                    },
                });
            });
    };
    drawable: DrawableIndexed<RenderPipeline<GroundVertShader>> | undefined;
    override create_collider(): rust_pointer<'collider'> {
        return engine.rust.create_trimesh_collider(this.id);
    }
    constructor(
        scenes: Scene[],
        public initialTexture: TextureView<Texture<GPUTextureFormat, TEXTURE_BINDING_SRC_TEXTURE>>,
        public vBuffer: VertexBuffer,
        public iBuffer: IndexBuffer,
        vertices: rust_vec_ptr<'f32'>,
        indicesView: rust_vec_ptr<'usize'>,
        verticesPositionStride: number
    ) {
        const mesh_id = new_rust_mesh({
            fixed: true,
            label: 'terrain',
            rigid_body: false,
            scenes,
        });
        super(
            {
                can_collide: true,
                static_faces: true,
                vertices: {
                    stride: verticesPositionStride,
                    view: vertices,
                },
            },
            mesh_id,
            false,
            indicesView,
            () => {
                const collider_ptr = this.create_collider();
                engine.rust.add_collider(this.id,
                    collider_ptr);
            }
        );
        if (engine.gpu) {
            this.sampler = engine.gpu.device.createSampler({
                magFilter: 'linear',
                minFilter: 'linear',
            });
            const renderPipeline = engine.gpu.createRenderPipeline(TerrainRenderPipeline,
                {
                },
                {
                    stride: verticesPositionStride,
                });
            this.drawable = new DrawableIndexed({
                node: this,
                renderPasses: new Set([
                    engine.gpu.renderPassScreen,
                    engine.gpu.renderPassWater,
                    engine.gpu.pickRenderPass
                ]),
                renderPipeline,
                vertexBuffers: [this.vBuffer],
            });

            this.drawable.setStaticBindGroup('TerrainInitialTexture',
                (bindGroup) => {
                    return ({
                        todo1: {
                            binding: 0,
                            resource: this.sampler!,
                        },
                        todo2: {
                            binding: 1,
                            resource: initialTexture.getTextureBinding(bindGroup),
                        },
                    });
                });
            this.drawable.setIndexBuffer(this.iBuffer,
                0,
                true,
                'uint32');
        }
    }
}