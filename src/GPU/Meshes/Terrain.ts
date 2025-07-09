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
import { IndexedDataNode } from '../../nodes/IndexedDataNode.js';

export class TerrainMesh extends IndexedDataNode {
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
    const sceneids = scenes
      ? scenes.reduce((acc, scene) => acc | scene.id, 0)
      : 1;
    const mesh = engine.rust.create_legacy_terrain_geometry(sceneids);
    super(
      {
        can_collide: true,
      },
      mesh,
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
