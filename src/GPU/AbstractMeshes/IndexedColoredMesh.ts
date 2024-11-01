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
      {
        connections: {
          main: 'main',
          pick: 'pick',
        },
      },
      engine.gpu!.shaders.vertexColorShader,
      engine.gpu!.shaders.simpleFragShader,
      simpleIndexedMeshProps,
    );
  }
}
