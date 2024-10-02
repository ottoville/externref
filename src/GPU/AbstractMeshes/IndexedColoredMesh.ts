import { MainNodeProps } from 'MainNode.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import {
  ColoredRenderPipeline,
  createSimpleFragShader2,
} from '../RenderPipeLines/ColoredRenderPipeline.js';
import {
  SimpleIndexedMesh,
  type SimpleIndexedMeshProps,
} from './SimpleIndexedMesh.js';
import { createVertexColorShader } from '../Shaders/VertexColoredWithNormal.vert.js';
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
      ColoredRenderPipeline,
      createVertexColorShader,
      createSimpleFragShader2,
      simpleIndexedMeshProps,
    );
  }
}
