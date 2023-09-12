import { BoundableNodeIndexed } from '../../nodes/BoundableNodeIndexed.js';
import type { Scene } from '../../Scene.js';
import type { Engine, rust_pointer, rust_vec_ptr } from '../../engine.js';
import { TerrainRenderPipeline } from '../RenderPipeLines/Terrain.js';
declare const engine: Engine;
import type { GroundVertShader } from '../Shaders/Ground.vert.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import { LightsTextureDrawableIndexed } from '../Drawables/LightsTextureDrawableIndexed.js';
import type {
  Buffer,
  FragmentShader,
  INDEX_BUFFER,
  TEXTURE_BINDING_TEXTURE,
  Texture,
  TextureView,
  VERTEX_BUFFER,
} from '../../webgpu-ts/index.js';

export class TerrainMesh extends BoundableNodeIndexed {
  sampler: GPUSampler | undefined;
  override drawable:
    | LightsTextureDrawableIndexed<
        RenderPipelineProps<GroundVertShader, FragmentShader>
      >
    | undefined = undefined;

  override create_collider(): rust_pointer<'collider'> {
    return engine.rust.create_trimesh_collider(this.id);
  }
  constructor(
    scenes: Scene[],
    public initialTexture: TextureView<
      Texture<GPUTextureFormat, TEXTURE_BINDING_TEXTURE>
    >,
    public vBuffer: Buffer<VERTEX_BUFFER>,
    public iBuffer: Buffer<INDEX_BUFFER>,
    vertices: rust_vec_ptr<'f32'>,
    indicesView: rust_vec_ptr<'usize'>,
    verticesPositionStride: number,
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
        engine.rust.add_collider(this.id, collider_ptr);
      },
    );
    if (engine.gpu) {
      this.sampler = engine.gpu.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
      });
      const renderPipeline = engine.gpu.createRenderPipeline(
        TerrainRenderPipeline,
        {},
        {
          stride: verticesPositionStride,
        },
      );

      this.drawable = new LightsTextureDrawableIndexed(
        {
          node: this,
          renderPasses: new Set([
            engine.gpu.renderPassScreen,
            engine.gpu.renderPassWater,
            engine.gpu.pickRenderPass,
          ]),
          renderPipeline,
          vertexBuffers: [
            {
              stride: verticesPositionStride,
              view: this.vBuffer,
            },
          ],
        },
        engine.gpu.lightsTextureBindGroup,
        initialTexture,
        this.sampler!,
      );
      this.drawable.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
    }
  }
}
