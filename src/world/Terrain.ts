import type { Scene } from '../Scene.js';
import { TerrainTool } from '../tools/TerrainTool.js';
import { TerrainMesh } from '../GPU/Meshes/Terrain.js';
import type { Engine } from '../engine.js';
import {
  CalculatePlaneIndices,
  createCalculatePlaneIndices,
} from '../GPU/Shaders/calculatePlaneIndices.comp.js';
import {
  CalculatePlaneHeights,
  createCalculatePlaneHeights,
} from '../GPU/Shaders/calculatePlaneHeights.comp.js';
import {
  CalculateNormals,
  createCalculateNormals,
} from '../GPU/Shaders/CalculateNormals.comp.js';
import { CreateGroundFromHeightMap } from '../GPU/Shaders/CreateGroundFromHeightMap.comp.js';
import type { GPU } from '../GPU.js';
import {
  TerrainTexture,
  SlopesLayout,
  CreateTerrainTexture,
} from '../GPU/Shaders/CreateTerrainTexture.comp.js';
import { IntArray, PlaneArray } from '../GPU/Shaders/structs/Structs.js';
import {
  BGLayout,
  BufLayout,
  ShaderStage,
  Texture,
  TextureUsageEnums,
  TextureView,
  Buffer,
  BufferUsageEnums,
  BindGroup,
  type RenderTargetTexture,
} from '../webgpu-ts/index.js';
import { TerrainSubdivisions } from '../GPU/Shaders/ShaderBuilders.js';
declare const engine: Engine;

const terrainSize = [10000, 10000] as const;
const subdivisions = [64, 64] as const;
export class Terrain {
  /*
TODO
     - No writable storage buffer layouts to vertex/fragment shader

     * */

  // 1000 * 1000: 40 - 50ms when no collision
  static readonly size = [10000, 10000] as const;
  static readonly #textureSize = {
    height: 8192,
    width: 8192,
  } as const;

  static readonly settings = {
    facetSize: subdivisions[0] * subdivisions[1],
    maxXZ: [terrainSize[0] / 2.0, terrainSize[1] / 2.0] as const,
    minmax: [-2, 500] as const,
    size: terrainSize,
    subdivisions: subdivisions,
    textureSize: {
      height: 8192,
      width: 8192,
    } as const,
  } as const;
  settings = Terrain.settings;

  readonly mesh: TerrainMesh;

  readonly #ready: Promise<void>;
  readonly #terrainIndicesLength =
    Uint32Array.BYTES_PER_ELEMENT *
    (TerrainSubdivisions[0] * TerrainSubdivisions[1] * 6);

  #autosave?: ReturnType<typeof setTimeout>;

  updateSwap2(offset = 0, byteLength: number, nofaces = false) {
    if (!engine.gpu) return;
    const b1 = new Buffer({
      gpu: engine.gpu.device,
      label: 'terrain_b1',
      mappedAtCreation: true,
      size: byteLength,
      usages: BufferUsageEnums.COPY_SRC,
    });
    new Float32Array(b1.getMappedRange()).set(
      new Float32Array(
        engine.rust.memory.buffer,
        engine.rust.vertices_pointer(this.mesh.geometry, false) + offset,
        byteLength / 4,
      ),
    );
    const commandEncoder = engine.gpu.device.createCommandEncoder({
      label: 'updateSwap2_encoder',
    });
    b1.unmap().copyTo(
      commandEncoder,
      this.terrainPositionAndUvsAndNormalsGPU,
      0,
      offset,
      byteLength,
    );
    if (!nofaces) {
      const facesCount = this.mesh.get_faces_count();
      const facesByteLength = facesCount * 4 * Float32Array.BYTES_PER_ELEMENT;
      const b2 = new Buffer({
        gpu: engine.gpu.device,
        label: 'terrain_b2',
        mappedAtCreation: true,
        size: facesByteLength,
        usages: BufferUsageEnums.COPY_SRC,
      });
      new Float32Array(b2.getMappedRange()).set(
        new Float32Array(
          engine.rust.memory.buffer,
          engine.rust.faces_pointer(this.mesh.id),
          facesCount * 4,
        ),
      );
      const unmapped = b2.unmap();
      commandEncoder.copyBufferToBuffer(
        unmapped.buffer, // source buffer
        0,
        engine.rust.get_raw_buffer(this.gpu.shaders.facet12ArrGPUBuffer), //destination buffer
        0,
        facesByteLength,
      );
      engine.gpu.device.queue.submit([commandEncoder.finish()]);
      b2.destroy();
    }
    b1.destroy();
    clearTimeout(this.#autosave);
    this.#autosave = setTimeout(
      () => engine.rust.serialize_terrain(this.mesh.id),
      10000,
    );
  }

  static async loadFromTexture(gpu: GPU, scenes: Scene[]): Promise<Terrain> {
    const positionsCount = ((size: number) => {
      while (size % 4 !== 0) size++;
      return size;
    })((TerrainSubdivisions[0] + 1) * (TerrainSubdivisions[1] + 1));

    const positionsLength = Float32Array.BYTES_PER_ELEMENT * positionsCount * 4;
    const uvsLength = Float32Array.BYTES_PER_ELEMENT * positionsCount * 4;
    const normalsLength = Float32Array.BYTES_PER_ELEMENT * positionsCount * 4;
    const verticesBufferSize = positionsLength + uvsLength + normalsLength;
    const directory = await (
      await navigator.storageBuckets.open('terrasim')
    ).getDirectory();
    let terrainPositionAndUvsAndNormalsGPU: Buffer<
      (typeof BufferUsageEnums)['VERTEX|STORAGE|COPY_SRC|COPY_DST'],
      false
    >;
    let serialize = true;
    await directory
      .getFileHandle('terrainvertices', { create: false })
      .then(async (cachedvertices) => {
        const file = await cachedvertices.getFile();
        const cachedBuffer = await file.arrayBuffer();
        var terrainPositionAndUvsAndNormalsGPUMapped = new Buffer({
          gpu: gpu.device,
          label: 'terrainPositionAndUvsAndNormalsGPU0',
          mappedAtCreation: true,
          size: verticesBufferSize,
          usages: BufferUsageEnums['VERTEX|STORAGE|COPY_SRC|COPY_DST'],
        });
        new Uint8Array(
          terrainPositionAndUvsAndNormalsGPUMapped.getMappedRange(),
        ).set(new Uint8Array(cachedBuffer));
        terrainPositionAndUvsAndNormalsGPU =
          terrainPositionAndUvsAndNormalsGPUMapped.unmap();
        serialize = false;
      })
      .catch(async () => {
        const b = await (await fetch('/images/tenerife250.webp')).blob();
        const bitmap = await createImageBitmap(b);

        const [bindLayouts, GroundFromHeightMapShader] =
          CreateGroundFromHeightMap(gpu, this.settings, bitmap);
        const CreateGroundFromHeightMapPipelineP =
          GroundFromHeightMapShader.createComputePipeline('main');

        const texture = new Texture({
          format: 'rgba8unorm',
          gpu: gpu.device,
          label: 'TerrainTexture',
          size: {
            height: bitmap.height,
            width: bitmap.width,
          },
          usages:
            TextureUsageEnums['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST'],
        });
        texture.copyFromExternalImage(
          {
            source: bitmap,
          },
          {},
          {
            height: bitmap.height,
            width: bitmap.width,
          },
        );

        const commandEncoder = gpu.device.createCommandEncoder({
          label: 'loadFromTexture_encoder',
        });
        const passEncoder = commandEncoder.beginComputePass({
          label: 'loadFromTexture_encoder_pass_encoder',
        });
        terrainPositionAndUvsAndNormalsGPU = new Buffer({
          gpu: gpu.device,
          label: 'terrainPositionAndUvsAndNormalsGPU1',
          size: verticesBufferSize,
          usages: BufferUsageEnums['VERTEX|STORAGE|COPY_SRC|COPY_DST'],
        });
        const view = new TextureView(texture, texture.props.format);
        const sourceBindGroup = new BindGroup(
          bindLayouts[0],
          'sourceBindGroup',
          (bindGroup) => ({
            pixels: view,
            positions:
              terrainPositionAndUvsAndNormalsGPU.getStorageBinding(bindGroup),
          }),
        );
        passEncoder.setPipeline(await CreateGroundFromHeightMapPipelineP);
        passEncoder.setBindGroup(0, sourceBindGroup.bindGroup);
        passEncoder.dispatchWorkgroups(
          TerrainSubdivisions[0] + 1,
          TerrainSubdivisions[1] + 1,
        );
        passEncoder.end();
        gpu.device.queue.submit([commandEncoder.finish()]);
      });
    const slopesLayout = new BGLayout(
      gpu.device,
      'slopesAndFacesBindGroupLayoutReadOnly',
      {
        facet12: new BufLayout(
          {
            buffer: {
              hasDynamicOffset: false,
              minBindingSize: 32,
              type: 'read-only-storage',
            },
            visibility: ShaderStage.COMPUTE,
          },
          PlaneArray,
        ),
        slopes: new BufLayout(
          {
            buffer: {
              hasDynamicOffset: false,
              minBindingSize: 32,
              type: 'read-only-storage',
            },
            visibility: ShaderStage.COMPUTE,
          },
          IntArray,
        ),
      },
    );

    const shaders = {
      calculateNormals: createCalculateNormals(this.settings, slopesLayout),
      calculatePlaneIndices: createCalculatePlaneIndices(gpu, this.settings),
      computePlaneHeights: createCalculatePlaneHeights(gpu, this.settings),
      createTexture: CreateTerrainTexture(this.settings, slopesLayout),
    };

    const pipelines: [
      Indices: GPUComputePipeline,
      Heights: GPUComputePipeline,
      Normals: GPUComputePipeline,
      Texture: GPUComputePipeline,
    ] = await Promise.all([
      shaders.calculatePlaneIndices[1].createComputePipeline('main'),
      shaders.computePlaneHeights[1].createComputePipeline('main'),
      shaders.calculateNormals[1].createComputePipeline('main'),
      shaders.createTexture[1].createComputePipeline('main'),
    ]);

    const t = new Terrain(
      gpu,
      scenes,
      slopesLayout,
      shaders,
      terrainPositionAndUvsAndNormalsGPU!,
      pipelines,
      serialize,
    );
    await t.#ready;
    return t;
  }

  readonly texture: RenderTargetTexture<
    (typeof TextureUsageEnums)['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC|STORAGE_BINDING'],
    'rgba8unorm',
    { readonly width: 8192; readonly height: 8192 }
  >;
  constructor(
    public gpu: GPU,
    public scenes: Scene[],
    slopesLayout: SlopesLayout,
    shaders: {
      calculatePlaneIndices: CalculatePlaneIndices;
      computePlaneHeights: CalculatePlaneHeights;
      calculateNormals: CalculateNormals;
      createTexture: TerrainTexture;
    },
    private terrainPositionAndUvsAndNormalsGPU: Buffer<
      (typeof BufferUsageEnums)['VERTEX|STORAGE|COPY_SRC|COPY_DST']
    >,
    [
      computePipelineIndices,
      computePlaneHeights,
      computePipelineNormals,
      createTexturePipeline,
    ]: [
      Indices: GPUComputePipeline,
      Heights: GPUComputePipeline,
      Normals: GPUComputePipeline,
      Texture: GPUComputePipeline,
    ],
    serialize: boolean,
  ) {
    this.texture = new Texture({
      format: 'rgba8unorm',
      gpu: gpu.device,
      label: 'Terrain',
      size: Terrain.#textureSize,
      usages:
        TextureUsageEnums[
          'RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC|STORAGE_BINDING'
        ],
    });
    const heightsBindGroupEntries = (bindGroup: BindGroup) => ({
      facet12: {
        buffer: engine.rust.get_raw_buffer(
          this.gpu.shaders.facet12ArrGPUBuffer,
        ),
      },
      slopes: this.gpu.shaders.slopeArrGPUBuffer.getStorageBinding(bindGroup),
    });
    const commandEncoder = gpu.device.createCommandEncoder({
      label: 'terrain_encoder',
    });
    const passEncoder = commandEncoder.beginComputePass({
      label: 'terrain_pass_encoder',
    });

    const terrainPositionAndUvsAndNormalsGPU_bgroup = (bindGroup: BindGroup) =>
      ({
        vertices:
          this.terrainPositionAndUvsAndNormalsGPU.getStorageBinding(bindGroup),
      }) as const;
    //todo: remove unneeded flags
    const terrainIndicesGPU = new Buffer({
      gpu: gpu.device,
      label: 'terrainIndicesGPUBuffer',
      size: this.#terrainIndicesLength,
      usages: BufferUsageEnums['INDEX|STORAGE|COPY_SRC'],
    });

    passEncoder.setPipeline(computePipelineIndices);

    passEncoder.setBindGroup(
      0,
      new BindGroup(
        shaders.calculatePlaneIndices[0][0],
        'terrainIndicesGPUBindgroup',
        (bindGroup) => ({
          indices: terrainIndicesGPU.getStorageBinding(bindGroup),
        }),
      ).bindGroup,
    );
    passEncoder.dispatchWorkgroups(...TerrainSubdivisions);

    passEncoder.setPipeline(computePlaneHeights);
    passEncoder.setBindGroup(
      0,
      new BindGroup(
        shaders.computePlaneHeights[0][0],
        'terrainPositionAndUvsAndNormalsGPU_Bindgroup',
        terrainPositionAndUvsAndNormalsGPU_bgroup,
      ).bindGroup,
    );

    passEncoder.setBindGroup(
      1,
      new BindGroup(
        shaders.computePlaneHeights[0][1],
        '_heightsBindGroupEntries',
        heightsBindGroupEntries,
      ).bindGroup,
    );
    passEncoder.dispatchWorkgroups(...TerrainSubdivisions);

    passEncoder.setPipeline(computePipelineNormals);

    passEncoder.setBindGroup(
      0,
      new BindGroup(
        shaders.calculateNormals[0][0],
        'terrainPositionAndUvsAndNormalsGPU_bgroup',
        terrainPositionAndUvsAndNormalsGPU_bgroup,
      ).bindGroup,
    );
    passEncoder.setBindGroup(
      1,
      new BindGroup(
        slopesLayout,
        'bindGroupHeightsRead2',
        heightsBindGroupEntries,
      ).bindGroup,
    );
    passEncoder.dispatchWorkgroups(
      TerrainSubdivisions[0] + 1,
      TerrainSubdivisions[1] + 1,
    );
    const textureView = new TextureView(
      this.texture,
      this.texture.props.format,
    );
    this.mesh = new TerrainMesh(
      scenes,
      textureView,
      this.terrainPositionAndUvsAndNormalsGPU,
    );
    this.#ready = caches
      .match(new Request('/terrainTexture.webp'))
      .then(async (cachedtexture) => {
        const gpuReadBufferPositions =
          engine.rust.create_mappadle_gpu_buffer_copydst_mapread(
            gpu.device,
            this.terrainPositionAndUvsAndNormalsGPU.props.size,
            'terrainPositionAndUvsAndNormalsGPURead',
          );
        const textureSizeBytes =
          Int32Array.BYTES_PER_ELEMENT *
          (Terrain.#textureSize.width * Terrain.#textureSize.height);
        if (cachedtexture) {
          passEncoder.end();
          commandEncoder.copyBufferToBuffer(
            this.terrainPositionAndUvsAndNormalsGPU.buffer, // source buffer
            0,
            engine.rust.get_raw_buffer(gpuReadBufferPositions), //destination buffer
            0,
          );
          var gpuReadBufferIndices =
            engine.rust.create_mappadle_gpu_buffer_copydst_mapread(
              gpu.device,
              terrainIndicesGPU.props.size,
              terrainIndicesGPU.props.label,
            );
          commandEncoder.copyBufferToBuffer(
            terrainIndicesGPU.buffer, // source buffer
            0,
            engine.rust.get_raw_buffer(gpuReadBufferIndices), //destination buffer
            0,
          );

          const bitmap = await createImageBitmap(await cachedtexture.blob());
          this.texture.copyFromExternalImage(
            {
              source: bitmap,
            },
            {},
            Terrain.#textureSize,
          );
          gpu.device.queue.submit([commandEncoder.finish()]);
        } else {
          const bindGroup1 = new BindGroup(
            shaders.createTexture[0][1],
            'writableTexture',
            (bindGroup) => ({
              ground_texture: textureView.getTextureBinding(bindGroup),
            }),
          );
          passEncoder.setPipeline(createTexturePipeline);
          const bindGroupHeightsRead = new BindGroup(
            slopesLayout,
            'bindGroupHeightsRead',
            heightsBindGroupEntries,
          );

          passEncoder.setBindGroup(0, bindGroupHeightsRead.bindGroup);
          passEncoder.setBindGroup(1, bindGroup1.bindGroup);
          passEncoder.dispatchWorkgroups(
            Terrain.#textureSize.width / 16,
            Terrain.#textureSize.height / 16,
          );
          passEncoder.end();

          commandEncoder.copyBufferToBuffer(
            this.terrainPositionAndUvsAndNormalsGPU.buffer, // source buffer
            0,
            engine.rust.get_raw_buffer(gpuReadBufferPositions), //destination buffer
            0,
          );

          // Get a GPU buffer for reading in an unmapped state.
          const gpuReadBuffer = new Buffer({
            gpu: gpu.device,
            label: 'terrainReaduBuffer',
            size: textureSizeBytes,
            usages: BufferUsageEnums['MAP_READ|COPY_DST'],
          });
          // Encode commands for copying buffer to buffer.
          gpuReadBuffer.copyFromTexture(
            commandEncoder,
            this.texture,
            {},
            {
              bytesPerRow: 4 * Terrain.#textureSize.width,
            },
            Terrain.#textureSize,
          );

          var gpuReadBufferIndices =
            engine.rust.create_mappadle_gpu_buffer_copydst_mapread(
              gpu.device,
              terrainIndicesGPU.props.size,
              terrainIndicesGPU.props.label,
            );
          commandEncoder.copyBufferToBuffer(
            terrainIndicesGPU.buffer, // source buffer
            0,
            engine.rust.get_raw_buffer(gpuReadBufferIndices), //destination buffer
            0,
          );
          const gpuCommands = commandEncoder.finish();
          gpu.device.queue.submit([gpuCommands]);
          const c = new OffscreenCanvas(
            Terrain.#textureSize.width,
            Terrain.#textureSize.height,
          );
          const ctx = c.getContext('2d');
          if (!ctx) throw new Error('get 2d context failed');
          gpuReadBuffer
            .readAndDestroy(async (arrayBuffer) => {
              ctx.putImageData(
                new ImageData(
                  new Uint8ClampedArray(arrayBuffer),
                  c.width,
                  c.height,
                ),
                0,
                0,
              );
              const blob = await c.convertToBlob({
                quality: 1,
                type: 'image/webp',
              });
              TerrainTool.saveTexture(await blob.arrayBuffer(), [
                Terrain.#textureSize.width,
                Terrain.#textureSize.height,
              ]);
            })
            .catch((err) => {
              engine.showError(err);
            });
        }

        engine.rust.set_indices_and_vertices_PositionAndNormalAndUV(
          this.mesh.id,
          gpuReadBufferIndices,
          gpuReadBufferPositions,
          gpu.gpu,
          serialize,
          this.gpu.shaders.facet12ArrGPUBuffer,
        );
      })
      .catch((err) => engine.showError(err));
  }
}
