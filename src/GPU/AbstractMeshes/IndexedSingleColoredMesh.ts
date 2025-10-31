import type { DataNodeProps } from '../../nodes/DataNode.js';
import {
  SimpleIndexedMesh,
  type SimpleIndexedMeshProps,
} from './SimpleIndexedMesh.js';
import { Engine } from 'engine.js';
declare const engine: Engine;

/**
 * Mesh where whole mesh is single colored
 */
export class IndexedSingleColoredMesh extends SimpleIndexedMesh {
  constructor(
    dataNodeProps: DataNodeProps,
    mesh_pointer: rust_pointer<'mesh_id'>,
    simpleIndexedMeshProps?: SimpleIndexedMeshProps,
  ) {
    super(
      dataNodeProps,
      mesh_pointer,
      engine.gpu
        ? {
            createRenderPipeline: {
              connections: {
                main: 'main',
                pick: 'pick',
              },
            },
            fragmentShaderBuilder: engine.gpu.shaders.simpleFragShader,
            gpu: engine.gpu,
            vertexShaderBuilder: engine.gpu.shaders.simpleVertShader,
          }
        : undefined,
      simpleIndexedMeshProps,
    );
  }
}
