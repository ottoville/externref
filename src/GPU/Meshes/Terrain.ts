import { BoundableNodeIndexed } from '../../nodes/BoundableNodeIndexed.js';
import type { Scene } from '../../Scene.js';
import type { Engine } from '../../engine.js';
declare const engine: Engine;
import {
  createGroundVertShader,
  type GroundVertShader,
} from '../Shaders/Ground.vert.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import { LightsTextureDrawableIndexed } from '../Drawables/LightsTextureDrawableIndexed.js';
import type {
  Buffer,
  FragmentShader,
  TEXTURE_BINDING_TEXTURE,
  Texture,
  TextureView,
  VERTEX_BUFFER,
} from '../../webgpu-ts/index.js';
import { RigidBody } from 'MainNode.js';

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
    public initialTexture: TextureView<Texture<TEXTURE_BINDING_TEXTURE>>,
    public vBuffer: Buffer<VERTEX_BUFFER>,
  ) {
    const geometry = engine.rust.create_legacy_terrain_geometry(
      true,
      true,
      false,
    );
    super(
      {
        can_collide: true,
        character_can_collide_to: true,
        vertices: geometry,
      },
      {
        label: 'terrain',
        rigid_body: RigidBody.off,
        scenes,
      },
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
      const renderPipeline = engine.gpu.createRenderPipelineBuilder({
        desc: {
          connections: {
            main: 'main',
            pick: 'pick',
          },
        },
        fragmentShaderBuilder: engine.gpu.shaders.groundFragShader,
        vertexShaderBuilder: createGroundVertShader(engine.gpu),
      });
      this.drawable = new LightsTextureDrawableIndexed(
        {
          node: this,
          renderPasses: new Set([
            engine.gpu.renderPassScreen,
            engine.gpu.renderPassWater,
            engine.gpu.pickRenderPass,
          ]),
          renderPipeline,
          vertexBuffers: [this.vBuffer],
        },
        engine.gpu.pipelineLayouts.lightsTextureBindGroup.bindGroupLayouts[3],
        initialTexture,
        this.sampler!,
      );
    }
  }
}
