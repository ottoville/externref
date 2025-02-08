import { MainNodeProps } from 'MainNode.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import {
  SimpleIndexedMesh,
  type SimpleIndexedMeshProps,
} from './SimpleIndexedMesh.js';
import { Engine } from 'engine.js';
declare const engine: Engine;

/**
 * Mesh where each vertex have a color value
 */
export class IndexedColoredMesh extends SimpleIndexedMesh {
  constructor(
    dataNodeProps: DataNodeProps,
    mainNodeProps: MainNodeProps,
    simpleIndexedMeshProps?: SimpleIndexedMeshProps,
  ) {
    super(
      dataNodeProps,
      mainNodeProps,
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
            vertexShaderBuilder: engine.gpu.shaders.vertexColorShader,
          }
        : undefined,
      simpleIndexedMeshProps,
    );
  }
}
