import type { Scene } from '../Scene.js';
import { DrawableSimple } from '../GPU/Drawables/DrawableSimple.js';
import type { Engine } from '../engine.js';
import type { RenderPipelineProps } from '../GPU/RenderPipeline.js';
import {
  createWaterVertShader,
  type WaterVertShader,
} from '../GPU/Shaders/Water.vert.js';
declare const engine: Engine;
import { BindGroup } from '../webgpu-ts/index.js';
import { createWaterFragShader } from '../GPU/Shaders/Water.frag.js';
import { DataNode } from '../nodes/DataNode.js';

export class Sea extends DataNode {
  override drawable:
    | DrawableSimple<RenderPipelineProps<WaterVertShader>>
    | undefined = undefined;
  override create_collider() {
    return engine.rust.create_cuboid_collider(50000, 3, 50000, 0, false);
  }
  constructor(scenes: Scene[]) {
    const mesh = engine.rust.create_water_mesh(
      scenes.reduce((acc, scene) => acc | scene.id, 0),
    );
    super(
      {
        can_collide: false,
      },
      mesh,
    ); //48
    if (engine.gpu) {
      const renderPipeline = engine.gpu.createRenderPipelineBuilder(
        {
          desc: {
            connections: {
              main: 'main',
            },
            primitive: {
              frontFace: 'cw',
              topology: 'triangle-strip',
            },
          },
          fragmentShaderBuilder: createWaterFragShader(engine.gpu),
          vertexShaderBuilder: createWaterVertShader(engine.gpu),
        },
        'uint16',
      );
      //TODO: Reuse sampler with terrain.ts?
      const sampler = engine.gpu.device.createSampler({
        magFilter: 'nearest',
        minFilter: 'nearest',
        mipmapFilter: 'nearest',
      });
      this.drawable = new DrawableSimple({
        bindGroups: [
          {
            bindGroup: new BindGroup(
              engine.gpu.pipelineLayouts.waterTextureLayot,
              'waterTexture',
              () => ({
                diffuseTexture:
                  engine.gpu!.renderPassWater.props.colorRenderTargets.diffuse
                    .renderTarget,
                mySampler: sampler,
              }),
            ),
          },
        ],
        node: this,
        renderPipeline,
        vertexBuffers: [
          [
            engine.rust.vertices_pointer(this.geometry, false),
            this.vertices_count * this.vertices_stride,
          ],
        ],
      });
    }
  }
}
