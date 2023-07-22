import type { rust_vec_ptr } from '../../engine.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import { SimpleIndexedMesh, type SimpleIndexedMeshProps } from './SimpleIndexedMesh.js';
import { SimpleRenderPipeline } from '../RenderPipeLines/SimpleRenderPipeline.js';
import { MainNodeProps } from 'MainNode.js';
/**
 * Mesh where whole mesh is single colored
 */
export class IndexedSingleColoredMesh extends SimpleIndexedMesh {
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
            SimpleRenderPipeline,
            simpleIndexedMeshProps);
    }
}