import { MainNodeProps } from 'MainNode.js';
import type { rust_vec_ptr } from '../../engine.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import { ColoredRenderPipeline } from '../RenderPipeLines/ColoredRenderPipeline.js';
import { SimpleIndexedMesh, type SimpleIndexedMeshProps } from './SimpleIndexedMesh.js';
/**
 * Mesh where each vertex have a color value
 */
export class IndexedColoredMesh extends SimpleIndexedMesh {
    constructor(
        dataNodeProps: DataNodeProps,
        mainNodeProps: MainNodeProps,
        indicesView: rust_vec_ptr<'usize'>,
        simpleIndexedMeshProps?: SimpleIndexedMeshProps
    ) {
        super(
            dataNodeProps,
            mainNodeProps,
            indicesView,
            ColoredRenderPipeline,
            simpleIndexedMeshProps);
    }
}