import { paintGround, type PTResultF } from './paintGround.js';
import { Terrain } from '../world/Terrain.js';
import type { Scene } from '../Scene.js';

import { TerraVector2, create_rust_vec_ptr } from '../Math.js';
import { DrawableIndexed } from '../GPU/Drawables/DrawableIndexed.js';
import type { Engine } from '../engine.js';
import {
  type PlaneAtGroundHeightVertShader,
  createPlaneAtGroundHeightVertShader,
} from '../GPU/Shaders/PlaneAtGroundHeight.vert.js';
import type { RenderPipelineProps } from '../GPU/RenderPipeline.js';
import { DataNode } from '../nodes/DataNode.js';
import { RigidBody } from 'MainNode.js';
declare const engine: Engine;

class PlaneMesh extends DataNode {
  override drawable: DrawableIndexed<
    RenderPipelineProps<PlaneAtGroundHeightVertShader>
  >;
  constructor(
    renderPipeline: RenderPipelineProps<PlaneAtGroundHeightVertShader>,
  ) {
    const geometry = engine.rust.create_tiled_mesh_geometry(100, 100);
    const pos_ptr = engine.rust.vertices_pointer(geometry);
    const pos_len =
      engine.rust.vertices_stride(geometry) *
      engine.rust.vertices_count(geometry);

    super(
      {
        character_can_collide_to: false,
        vertices: geometry,
      },
      {
        label: 'plane',
        rigid_body: RigidBody.off,
      },
      create_rust_vec_ptr(engine.rust.indices_field_pointer(geometry)),
      false,
    );
    this.drawable = new DrawableIndexed({
      bindGroups: [],
      node: this,
      renderPipeline,
      vertexBuffers: [[pos_ptr, pos_len]],
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
    const createPlaneAtGroundHeightVertShader2 = Object.freeze([
      'planeAtGroundHeight.vert',
      createPlaneAtGroundHeightVertShader,
    ] as const);
    const renderPipeline = ground.gpu.createRenderPipeline(
      {
        connections: {
          main: 'main',
        },
        primitive: {
          cullMode: 'back',
          frontFace: 'cw',
          topology: 'triangle-list',
        },
      },
      createPlaneAtGroundHeightVertShader2,
      ground.gpu.shaders.ColorShader,
      {
        stride: 12 as Word<'dword'>,
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
