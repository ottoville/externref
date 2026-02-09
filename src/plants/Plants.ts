import { WorkerThread, WorkerReturn } from '../WorkerThread.js';
import { Terrain } from '../world/Terrain.js';

import type { Scene } from '../Scene.js';

import type { Engine } from '../engine.js';
import { DrawableIndirect } from '../GPU/Drawables/DrawableIndirect.js';
import { createGrassHeightAtCoordinates } from '../GPU/Shaders/grass/GrassHeightAtCoordinates.comp.js';
import { MainNode } from '../MainNode.js';
import { allocate_vec } from '../nodes/DataNode.js';
import { BindGroup, Buffer, BufferUsageEnums } from '../webgpu-ts/index.js';
import type { PTDresult } from 'paintGround/paintGround.js';
import { createGrassVertShader } from '../GPU/Shaders/Grass.vert.js';
import { create_rust_string } from '../utils.js';
declare const engine: Engine;

/**
 * Sets up indices for single blade mesh.
 * @param id array of indices
 * @param vc1 vertex start offset for front side of blade
 * @param vc2 vertex start offset for back side of blade
 * @param i index offset
 */
const numBlades = 65535;

export class Plants extends MainNode {
  drawable?: DrawableIndirect | undefined;
  public opts = {
    radius: 86,
  };
  //private offset: SharedArrayBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 2 * this.numBlades);
  #worker = new WorkerThread('grass.js');
  #ready: Promise<void>;
  public fillArea(area: PTDresult) {
    //let amount = 100000

    this.#ready
      .then(() => {
        this.#worker
          .message(
            WorkerReturn.noReturn,
            'save',
            {
              angle: area.rad,
              area: area,
            },
            [],
          )
          .catch((err) => {
            engine.showError(err);
          });
      })
      .catch((err) => engine.showError(err));
  }
  constructor(scene: Scene, terrainP: Promise<Terrain>) {
    const mesh = engine.rust.create_plants_mesh();
    super(mesh);

    const indirectBuffer = new Buffer({
      gpu: scene.gpu.device,
      label: 'indirectBuffer',
      size: 4 * 4,
      usages: BufferUsageEnums['INDIRECT|COPY_DST'],
    });
    const positionGPU = new Buffer({
      gpu: scene.gpu.device,
      label: 'positionGPU',
      size: numBlades * 4 * 4,
      usages: BufferUsageEnums['VERTEX|COPY_DST'],
    });
    const shapeGPU = new Buffer({
      gpu: scene.gpu.device,
      label: 'shapeGPU',
      size: numBlades * 4 * 4,
      usages: BufferUsageEnums['VERTEX|COPY_DST'],
    });
    const positionGPUSwap = new Buffer({
      gpu: scene.gpu.device,
      label: 'positionGPUSwap',
      size: numBlades * 4 * 4,
      usages: BufferUsageEnums['STORAGE|COPY_SRC'],
    });
    const shapeGPUSwap = new Buffer({
      gpu: scene.gpu.device,
      label: 'shapeGPUSwap',
      size: numBlades * 4 * 4,
      usages: BufferUsageEnums['STORAGE|COPY_SRC'],
    });
    if (engine.gpu) {
      const renderPipeline = engine.gpu.createRenderPipelineBuilder(
        {
          desc: {
            connections: {
              main: 'main',
            },
            primitive: {
              cullMode: 'none',
              topology: 'triangle-strip',
            },
          },
          fragmentShaderBuilder: scene.gpu.shaders.ColorShader,
          vertexShaderBuilder: createGrassVertShader(engine.gpu),
        },
        'uint16',
      );
      const vertices = allocate_vec(
        Float32Array.of(
          0.02,
          0.0,
          -0.02,
          0.0,
          0.014,
          0.29,
          -0.014,
          0.29,
          0.007,
          0.57,
          -0.007,
          0.57,
          0.0,
          1.0,
        ),
      );
      this.drawable = new DrawableIndirect(
        {
          bindGroups: [],
          node: this,
          renderPipeline,
          vertexBuffers: [positionGPU, shapeGPU, [vertices[0], vertices[1]]],
        },
        indirectBuffer,
      );
    }

    const shapes = new SharedArrayBuffer(
      Float32Array.BYTES_PER_ELEMENT * 3 * numBlades,
    );
    const noises = new SharedArrayBuffer(
      Float32Array.BYTES_PER_ELEMENT * numBlades,
    );
    //@ts-expect-error todo
    window.downloadGrass = () => {
      caches
        .match(new Request('/grass'))
        .then(async (cachedgrass) => {
          if (cachedgrass) {
            console.log('grass', URL.createObjectURL(await cachedgrass.blob()));
          }
        })
        .catch((e) => {
          console.error(e);
        });
    };

    this.#ready = terrainP
      .then(async (terrain) => {
        const [bindLayouts, getHeightAtCoordinatesShader] =
          createGrassHeightAtCoordinates(Terrain.settings, scene.gpu);

        const computePipeline =
          await getHeightAtCoordinatesShader.createComputePipeline('main');

        this.#worker.subscribe(
          'updated',
          (data: { buffer: SharedArrayBuffer }) => {
            const commandEncoder = scene.gpu.device.createCommandEncoder({
              label: 'plants_encoder',
            });
            const passEncoder = commandEncoder.beginComputePass({
              label: 'plants_pass_encoder',
            });
            passEncoder.setPipeline(computePipeline);
            const worldCopyGPU = new Buffer({
              gpu: scene.gpu.device,
              label: 'worldCopyGPU',
              mappedAtCreation: true,
              size: numBlades * 2 * 4,
              usages: BufferUsageEnums['STORAGE|COPY_DST'],
            });
            const worldSetArr = worldCopyGPU.getMappedRange();
            new Uint8Array(worldSetArr).set(new Uint8Array(data.buffer));
            const worldCopyGPUUnmapped = worldCopyGPU.unmap();
            const bindGroup2 = new BindGroup(
              bindLayouts[1],
              'bindGroup2',
              (bg) => ({
                positions: worldCopyGPUUnmapped.getStorageBinding(bg),
              }),
            );

            passEncoder.setBindGroup(0, bindGroup.bindGroup);
            passEncoder.setBindGroup(1, bindGroup2.bindGroup);
            passEncoder.dispatchWorkgroups(numBlades);
            passEncoder.end();

            positionGPUSwap.copyTo(
              commandEncoder,
              positionGPU,
              0,
              0,
              numBlades * 4 * 4,
            );

            shapeGPUSwap.copyTo(
              commandEncoder,
              shapeGPU,
              0,
              0,
              numBlades * 4 * 4,
            );
            const data2 = new Uint32Array([7, (data.buffer.byteLength / 4) * 2])
              .buffer;
            const swapBuffer2 = engine.rust.create_mapped_gpu_buffer_copysrc(
              scene.gpu.device,
              data2.byteLength,
              ...create_rust_string('_swap'),
            );
            const srcOffset = 0;
            const rawSwapBuffer = engine.rust.get_raw_buffer(swapBuffer2);
            new Int8Array(rawSwapBuffer.getMappedRange()).set(
              new Int8Array(
                data2,
                srcOffset,
                data2.byteLength / Int8Array.BYTES_PER_ELEMENT,
              ),
            );
            rawSwapBuffer.unmap();
            commandEncoder.copyBufferToBuffer(
              rawSwapBuffer, // source buffer
              0,
              indirectBuffer.buffer, //destination buffer
              0,
              Math.min(rawSwapBuffer.size, indirectBuffer.buffer.size),
            );
            engine.rust.push_to_temp_gpu_buffers(swapBuffer2);

            engine.rust.push_to_pending_command_buffers(
              commandEncoder.finish(),
              scene.gpu.gpu,
            );
          },
        );
        await this.#worker.message(
          WorkerReturn.Promise,
          'init',
          {
            noises: noises,
            shape: shapes,
          },
          [],
        );

        const bindGroup = new BindGroup(
          bindLayouts[0],
          'bindGroup1',
          (bindGroup1) => ({
            facet12: {
              buffer: engine.rust.get_raw_buffer(
                terrain.gpu.shaders.facet12ArrGPUBuffer,
              ),
            },
            positionAndRotate: positionGPUSwap.getStorageBinding(bindGroup1),
            shapes: shapeGPUSwap.getStorageBinding(bindGroup1),
            slopes:
              terrain.gpu.shaders.slopeArrGPUBuffer.getStorageBinding(
                bindGroup1,
              ),
          }),
        );
      })
      .catch((err) => engine.showError(err));
  }
}
