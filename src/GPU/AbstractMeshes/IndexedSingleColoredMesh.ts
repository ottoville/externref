import type { DataNodeProps } from '../../nodes/DataNode.js';
import {
  SimpleIndexedMesh,
  type SimpleIndexedMeshProps,
} from './SimpleIndexedMesh.js';
import { SimpleRenderPipeline } from '../RenderPipeLines/SimpleRenderPipeline.js';
import { MainNodeProps } from 'MainNode.js';
import { createSimpleFragShader2 } from '../RenderPipeLines/ColoredRenderPipeline.js';
import { createSimpleVertShader } from '../Shaders/SingleColoredWithNormal.vert.js';
/**
 * Mesh where whole mesh is single colored
 */
export class IndexedSingleColoredMesh extends SimpleIndexedMesh {
  constructor(
    dataNodeProps: DataNodeProps,
    mainNodeProps: MainNodeProps,
    simpleIndexedMeshProps?: SimpleIndexedMeshProps,
  ) {
    super(
      dataNodeProps,
      mainNodeProps,
      SimpleRenderPipeline,
      createSimpleVertShader,
      createSimpleFragShader2,
      simpleIndexedMeshProps,
    );
  }
}
