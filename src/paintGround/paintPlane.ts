import { paintGround } from './paintGround.js';
import { Terrain } from '../world/Terrain.js';
import type { PTResultF } from '../types/interfaces/index.js';
import type { Scene } from '../Scene.js';

import { TerraVector2 } from '../Math.js';
import { DrawableIndexed } from '../GPU/Drawables/DrawableIndexed.js';
import type { Engine, rust_pointer } from '../engine.js';
import {
  PlaneAtGroundHeightVertShader,
  createPlaneAtGroundHeightVertShader,
} from '../GPU/Shaders/PlaneAtGroundHeight.vert.js';
import { RenderPipeline } from '../GPU/RenderPipeline.js';
import { DataNode } from '../nodes/DataNode.js';
import { createColorFragmentShader } from '../GPU/Shaders/Color.frag.js';
import type { CreateRenderPipelineProps } from 'GPU.js';
import { createRenderPipelineBuilder } from '../webgpu-ts/index.js';
declare const engine: Engine;

class PlaneMesh extends DataNode {
  override drawable: DrawableIndexed<
    RenderPipeline<PlaneAtGroundHeightVertShader>
  >;
  constructor(renderPipeline: RenderPipeline<PlaneAtGroundHeightVertShader>) {
    const ptrs = engine.rust.create_tiled_mesh_ptr(100, 100);
    const [pos_ptr, pos_len, pos_cap, ind_ptr, ind_len, ind_cap] =
      new Uint32Array(engine.rust.memory.buffer, ptrs, 6);

    super(
      {
        character_can_collide_to: false,
        vertices: {
          stride:
            renderPipeline.props.vertexShader.props.entryPoints.main
              .vertexBufferLayout[0].arrayStride,
          view: [pos_ptr as rust_pointer<'f32'>, pos_len!, pos_cap!],
        },
      },
      {
        label: 'plane',
        rigid_body: false,
      },
      [ind_ptr as rust_pointer<'usize'>, ind_len!, ind_cap!],
      false,
    );
    this.drawable = new DrawableIndexed({
      node: this,
      renderPipeline,
      vertexBuffers: [
        {
          stride: 12,
          view: [pos_ptr as rust_pointer<'f32'>, pos_len!, pos_cap!],
        },
      ],
    });
  }
}

export class paintPlane extends paintGround {
  #mesh: PlaneMesh;
  #widthVector: [number, number] = [0, 0];
  #startingPoint = new TerraVector2(2);
  #meshPosition: [number, number, number] = [0, 0, 0];

  constructor(scene: Scene, ground: Terrain, callback: PTResultF) {
    super(scene, ground, (p) => {
      this.#mesh.update_scale(this.#mesh.scale_x, this.#mesh.scale_y, 0);
      callback(p);
    });
    const renderPipeline = ground.gpu.createRenderPipeline(
      [
        'paintPlaneRenderpipeline',
        (
          { label, primitive }: CreateRenderPipelineProps,
          vertexBufferProps,
        ) => {
          const vertexShader = createPlaneAtGroundHeightVertShader(
            ground.TerrainHeightsbindGroupTree,
            {
              arrayStride: vertexBufferProps.stride * 4,
              attributes2: Object.freeze({
                position: {
                  format: 'float32x3',
                  offset: 0,
                  shaderFormat: 'vec4<f32>',
                  shaderLocation: 0,
                },
              } as const),
              stepMode: 'vertex',
            },
            Terrain.settings,
          );
          const fragmentShader = createColorFragmentShader(
            ground.TerrainHeightsbindGroupTree,
          );
          return new RenderPipeline(
            {
              bindgroupdrawable: ground.TerrainHeightsbindGroupTree,
              builder: createRenderPipelineBuilder(
                vertexShader,
                fragmentShader,
              ),
              connections: {
                main: 'main',
              },
              descriptor: {
                primitive,
              },
              fragmentShader,
              label,
              vertexShader,
            },
            undefined,
          );
        },
      ],
      {
        cullMode: 'back',
        frontFace: 'cw',
        topology: 'triangle-list',
      },
      {
        stride: 12,
      },
    );

    this.#mesh = new PlaneMesh(renderPipeline);
  }
  override destroy() {
    super.destroy();
    this.#mesh.destroy();
  }

  onMainPointerDown(startingPoint: TerraVector2) {
    this.#startingPoint = startingPoint;
  }
  onMainPointerUp(height: number): void {
    this.#widthVector = [
      this.drawVector[1] / this.size.height,
      this.drawVector[0] / this.size.height,
    ];
    const halfYaw = (this.ang360.rad - Math.PI) * 0.5;
    this.#meshPosition = [
      this.#startingPoint[0] + this.drawVector[0] * -0.5,
      5,
      this.#startingPoint[1] + this.drawVector[1] * 0.5,
    ];
    this.#mesh.translation = this.#meshPosition;
    engine.rust.update_scale_and_rotation(
      this.#mesh.id,
      height * 0.5,
      this.#mesh.scale_y,
      this.#mesh.scale_z,
      0,
      Math.sin(halfYaw),
      0,
      Math.cos(halfYaw),
    );
  }

  onAreaDraw(width: number) {
    const halfWidth = width * 0.5;
    this.#mesh.update_scale(this.#mesh.scale_x, this.#mesh.scale_y, halfWidth);
    this.#mesh.translation = [
      this.#meshPosition[0] - halfWidth * this.#widthVector[0],
      this.#meshPosition[1],
      this.#meshPosition[2] - halfWidth * this.#widthVector[1],
    ];
  }
}
