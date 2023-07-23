import { BoundableNodeIndexed } from '../../nodes/BoundableNodeIndexed.js';
import type { Scene } from '../../Scene.js';
import { DrawableIndexed } from '../Drawables/DrawableIndexed.js';
import type { Engine, rust_pointer, rust_vec_ptr } from '../../engine.js';
import { TerrainRenderPipeline } from '../RenderPipeLines/Terrain.js';
declare const engine: Engine;
import type { IndexBuffer } from '../../GPU/Buffer/Buffer.js';
import type { TextureView } from '../TextureView.js';
import type { GroundVertShader } from '../Shaders/Ground.vert.js';
import type { RenderPipeline } from '../RenderPipeline.js';
import type { TEXTURE_BINDING_TEXTURE, Texture } from '../../GPU/Texture.js';
import type { Buffer2, VERTEX_BUFFER } from '../Buffer/Buffer2.js';

export class TerrainMesh extends BoundableNodeIndexed {
    sampler: GPUSampler | undefined;
    setTextureView = (textureview: TextureView<Texture<GPUTextureFormat, TEXTURE_BINDING_TEXTURE>>) => {
        this.drawable!.setStaticBindGroup('terrainTexture',
            (bindGroup) => {
                return ({
                    todo1: this.sampler!,
                    todo2: textureview.getTextureBinding(bindGroup),
                });
            });
    };
    override drawable: DrawableIndexed<RenderPipeline<GroundVertShader>> | undefined = undefined;

    override create_collider(): rust_pointer<'collider'> {
        return engine.rust.create_trimesh_collider(this.id);
    }
    constructor(
        scenes: Scene[],
        public initialTexture: TextureView<Texture<GPUTextureFormat, TEXTURE_BINDING_TEXTURE>>,
        public vBuffer: Buffer2<VERTEX_BUFFER>,
        public iBuffer: IndexBuffer,
        vertices: rust_vec_ptr<'f32'>,
        indicesView: rust_vec_ptr<'usize'>,
        verticesPositionStride: number
    ) {
        super(
            {
                can_collide: true,
                static_faces: true,
                vertices: {
                    stride: verticesPositionStride,
                    view: vertices,
                },
            },
            {
                fixed: true,
                label: 'terrain',
                rigid_body: false,
                scenes,
            },
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
                vertexBuffers: [
                    {
                        stride: verticesPositionStride,
                        view: this.vBuffer,
                    }
                ],
            });

            this.drawable.setStaticBindGroup('TerrainInitialTexture',
                (bindGroup) => {
                    return ({
                        todo1: this.sampler!,
                        todo2: initialTexture.getTextureBinding(bindGroup),
                    });
                });
            this.drawable.setIndexBuffer(this.iBuffer,
                0,
                true,
                'uint32');
        }
    }
}