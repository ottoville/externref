import { paintGround, type PTResultF } from './paintGround.js';
import { Terrain } from '../world/Terrain.js';
import type { Scene } from '../Scene.js';

import { DrawableIndexed } from '../GPU/Drawables/DrawableIndexed.js';
import type { Engine } from '../engine.js';
import {
  type PlaneAtGroundHeightVertShader,
  createPlaneAtGroundHeightVertShader,
} from '../GPU/Shaders/PlaneAtGroundHeight.vert.js';
import type { RenderPipelineProps } from '../GPU/RenderPipeline.js';
import { IndexedDataNode } from '../nodes/IndexedDataNode.js';
declare const engine: Engine;

class PlaneMesh extends IndexedDataNode {
  override drawable: DrawableIndexed<
    RenderPipelineProps<PlaneAtGroundHeightVertShader>
  >;
  constructor(
    renderPipeline: RenderPipelineProps<PlaneAtGroundHeightVertShader>,
  ) {
    const mesh = engine.rust.create_plane_mesh(engine.gpu!.gpu);
    const geometry = engine.rust.get_geometry(mesh);
    const pos_ptr = engine.rust.vertices_pointer(geometry, false);
    const pos_len =
      engine.rust.vertices_stride(geometry) *
      engine.rust.vertices_count(geometry);

    super({}, mesh);
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
  #startingPoint: [number, number] = [0, 0];
  #meshPosition: [number, number, number] = [0, 0, 0];

  constructor(scene: Scene, ground: Terrain, callback: PTResultF) {
    super(scene, ground, (p) => {
      this.#mesh.update_scale(this.#mesh.scale_x, this.#mesh.scale_y, 0);
      callback(p);
    });
    const renderPipeline = ground.gpu.createRenderPipelineBuilder({
      desc: {
        connections: {
          main: 'main',
        },
        primitive: {
          cullMode: 'back',
          frontFace: 'cw',
          topology: 'triangle-list',
        },
      },
      fragmentShaderBuilder: ground.gpu.shaders.ColorShader,
      vertexShaderBuilder: createPlaneAtGroundHeightVertShader(ground.gpu),
    });

    this.#mesh = new PlaneMesh(renderPipeline);
  }
  override destroy() {
    super.destroy();
    this.#mesh.destroy();
  }

  onMainPointerDown(startingPoint: [number, number]) {
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
    this.#mesh.setTranslation(this.#meshPosition);
    const scaleZ = this.#mesh.getScaleZ();

    engine.rust.update_scale_and_rotation(
      this.#mesh.id,
      height * 0.5,
      this.#mesh.scale_y,
      scaleZ,
      0,
      Math.sin(halfYaw),
      0,
      Math.cos(halfYaw),
    );
  }

  onAreaDraw(width: number) {
    const halfWidth = width * 0.5;
    this.#mesh.update_scale(this.#mesh.scale_x, this.#mesh.scale_y, halfWidth);

    this.#mesh.setTranslation([
      this.#meshPosition[0] - halfWidth * this.#widthVector[0],
      this.#meshPosition[1],
      this.#meshPosition[2] - halfWidth * this.#widthVector[1],
    ]);
  }
}
