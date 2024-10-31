import { BoundableNodeSimple } from '../nodes/BoundableNodeSimple.js';
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
import { RigidBody } from 'MainNode.js';
import { createWaterFragShader } from '../GPU/Shaders/Water.frag.js';

export class Sea extends BoundableNodeSimple {
  override drawable:
    | DrawableSimple<RenderPipelineProps<WaterVertShader>>
    | undefined = undefined;
  override create_collider() {
    return engine.rust.create_cuboid_collider(50000, 3, 50000, 0, false);
  }
  constructor(scenes: Scene[]) {
    const geometry = engine.rust.create_water_geometry();
    super(
      {
        can_collide: false,
        vertices: geometry,
      },
      {
        label: 'water',
        rigid_body: RigidBody.off,
        scenes,
      },
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
          fragmentShaderBuilder: createWaterFragShader,
          vertexShaderBuilder: createWaterVertShader,
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
              engine.gpu.waterTextureLayot,
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
            engine.rust.vertices_pointer(this.geometry),
            this.vertices_count * this.vertices_stride,
          ],
        ],
      });
    }
  }
}
