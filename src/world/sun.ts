import type { Scene } from '../Scene.js';
import { MainNode, RigidBody } from '../MainNode.js';
import { Angle } from '../Math.js';
import { DrawableSimple } from '../GPU/Drawables/DrawableSimple.js';
import type { Engine } from '../engine.js';
import type { GPU } from '../GPU.js';
import type { RenderPipelineProps } from '../GPU/RenderPipeline.js';
import {
  createSunVertShader,
  type SunVertShader,
} from '../GPU/Shaders/Sun.vert.js';
import { createSingleColorFragShader } from '../GPU/Shaders/SingleColor.frag.js';
import { DataNode } from '../nodes/DataNode.js';
declare const engine: Engine;

const zAngle = Math.cos(Math.PI * 0.2);
const yAngle = Math.sin(Math.PI * 0.2);
const anglePerMinute = (Math.PI * 2) / 1440; //1440 is minutes in a day
const meridian = Math.PI * 0.5;

export class Sun extends MainNode {
  #clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  };

  override onPhysicTick = (_delta: number, mesh: rust_pointer<'mesh'>) => {
    const secondsOfDay = engine.physics.tickTime % 86400;
    const minutesOfDay = secondsOfDay / 60;
    const sunAngle = new Angle(minutesOfDay * anglePerMinute).sub(meridian);

    const sin = Math.sin(sunAngle);

    const sunPositionX = Math.cos(sunAngle);
    const sunPositionZ = sin * zAngle;
    const sunPositionY = sin * yAngle;

    const translation = DataNode.getTranslation(mesh);
    DataNode.setVelocity(mesh, [
      sunPositionX - translation[0]!,
      sunPositionY - translation[1]!,
      sunPositionZ - translation[2]!,
    ]);
    //const ambientR = this.clamp((sunPositionY * 2 + 0.4) * 0.8, 0.05, 0.3);
    const ambientR = this.#clamp((sunPositionY + 0.4) * 0.8, 0.05, 0.3);
    const ambientGB = this.#clamp((sunPositionY + 0.1) * 0.4 - 0.1, 0.05, 0.3);

    engine.rust.set_color(mesh, 1, 1, 1, 1);
    //earth shadow
    engine.rust.set_ambient(mesh, ambientR, ambientGB, ambientGB);
    engine.rust.set_shadow(mesh, this.#clamp(sunPositionY * 8 + 1, 0, 1)); // <<3 == * 8
    engine.rust.update_dynamic_buffer(mesh);
  };
  drawable: DrawableSimple<RenderPipelineProps<SunVertShader>> | undefined;
  constructor(gpu: GPU, scenes: Scene[]) {
    super({
      camera_can_collide_to: false,
      directional_light: 1,
      label: 'sun',
      rigid_body: RigidBody.off,
      scenes,
    });
    this.positions_count = 14;

    const renderPipeline = gpu.createRenderPipelineBuilder(
      {
        desc: {
          connections: {
            main: 'main',
          },
          depthBuffer: {
            depthCompare: 'always',
            depthWriteEnabled: false,
          },
          primitive: {
            cullMode: 'none',
            topology: 'triangle-strip',
          },
        },
        fragmentShaderBuilder: createSingleColorFragShader(gpu),

        vertexShaderBuilder: createSunVertShader(gpu),
      },
      'uint16',
    );
    this.drawable = new DrawableSimple({
      bindGroups: [],
      node: this,
      renderPasses: new Set([gpu.renderPassScreen, gpu.renderPassWater]),
      renderPipeline,
      vertexBuffers: [] as [],
    });

    engine.physics.movables.push(this);
  }
}
