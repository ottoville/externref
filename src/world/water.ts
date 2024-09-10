import { BoundableNodeSimple } from '../nodes/BoundableNodeSimple.js';
import type { Scene } from '../Scene.js';
import { DrawableSimple } from '../GPU/Drawables/DrawableSimple.js';
import type { Engine } from '../engine.js';
import type { RenderPipelineProps } from '../GPU/RenderPipeline.js';
import {
  createWaterVertShader,
  type WaterVertShader,
} from '../GPU/Shaders/Water.vert.js';
import { allocate_vec } from '../nodes/DataNode.js';
declare const engine: Engine;
import { BindGroup } from '../webgpu-ts/index.js';
import { RigidBody } from 'MainNode.js';
import { createWaterFragShader } from '../GPU/Shaders/Water.frag.js';
const WaterRenderPipeline = Object.freeze({
  connections: {
    main: 'main',
  },
} as const);

export class Sea extends BoundableNodeSimple {
  override drawable:
    | DrawableSimple<RenderPipelineProps<WaterVertShader>>
    | undefined = undefined;
  override create_collider() {
    return engine.rust.create_cuboid_collider(50000, 3, 50000, 0, false);
  }
  constructor(scenes: Scene[]) {
    const vertexBuffer = {
      stride: 4 as Word<'dword'>,
      view: allocate_vec(
        Float32Array.of(
          -50000.0,
          3.0,
          -50000.0,
          0,

          50000.0,
          3.0,
          -50000.0,
          0,

          -50000.0,
          3.0,
          50000.0,
          0,

          50000.0,
          3.0,
          50000.0,
          0,
        ),
      ),
    };
    super(
      {
        can_collide: false,
        vertices: vertexBuffer,
      },
      {
        label: 'water',
        rigid_body: RigidBody.off,
        scenes,
      },
      true,
    ); //48
    if (engine.gpu) {
      const renderPipeline = engine.gpu.createRenderPipelineBuilder(
        {
          ...WaterRenderPipeline,
          primitive: {
            frontFace: 'cw',
            stripIndexFormat: 'uint16',
            topology: 'triangle-strip',
          },
        },
        createWaterVertShader,
        createWaterFragShader,
        {
          stride: 4 as Word<'dword'>,
        },
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
        vertexBuffers: [[vertexBuffer.view[0], vertexBuffer.view[1]]],
      });
    }
  }
}
