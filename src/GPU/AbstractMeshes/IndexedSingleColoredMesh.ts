import type { DataNodeProps } from '../../nodes/DataNode.js';
import {
  SimpleIndexedMesh,
  type SimpleIndexedMeshProps,
} from './SimpleIndexedMesh.js';
import { MainNodeProps } from 'MainNode.js';
import { Engine } from 'engine.js';
declare const engine: Engine;

/**
 * Mesh where whole mesh is single colored
 */
export class IndexedSingleColoredMesh extends SimpleIndexedMesh {
  constructor(
    dataNodeProps: DataNodeProps,
    mainNodeProps: MainNodeProps | number,
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
      engine.gpu!.shaders.simpleVertShader,
      engine.gpu!.shaders.simpleFragShader,
      simpleIndexedMeshProps,
    );
  }
}
