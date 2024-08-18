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
    indicesView: rust_vec_ptr<'usize'>,
    simpleIndexedMeshProps?: SimpleIndexedMeshProps,
  ) {
    super(
      dataNodeProps,
      mainNodeProps,
      indicesView,
      ColoredRenderPipeline,
      createVertexColorShader,
      createSimpleFragShader2,
      simpleIndexedMeshProps,
    );
  }
}
