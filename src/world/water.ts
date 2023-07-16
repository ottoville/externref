import { BoundableNodeSimple } from '../nodes/BoundableNodeSimple.js';
import type { Scene } from '../Scene.js';
import { DrawableSimple } from '../GPU/Drawables/DrawableSimple.js';
import { WaterRenderPipeline } from '../GPU/RenderPipeLines/Water.js';
import type { Engine } from '../engine.js';
import type { RenderPipeline } from '../GPU/RenderPipeline.js';
import type { WaterVertShader } from '../GPU/Shaders/Water.vert.js';
import { new_rust_mesh } from '../MainNode.js';
import { allocate_vec } from '../nodes/DataNode.js';
declare const engine: Engine;

export class Sea extends BoundableNodeSimple {
    drawable: DrawableSimple<RenderPipeline<WaterVertShader>> | undefined;
    override create_collider() {
        return engine.rust.create_cuboid_collider(50000,
            3,
            50000,
            0,
            false);
    }
    constructor(scenes: Scene[]) {
        super(
            {
                can_collide: false,
                vertices: {
                    stride: 3,
                    view: allocate_vec(Float32Array.of(
                        -50000.0,
                        3.0,
                        -50000.0,
                        50000.0,
                        3.0,
                        -50000.0,
                        -50000.0,
                        3.0,
                        50000.0,
                        50000.0,
                        3.0,
                        50000.0
                    )),
                },
            },
            new_rust_mesh({
                fixed: true,
                label: 'water',
                rigid_body: false,
                scenes,
                strip: true,
            }),
            true
        ); //48
        if (engine.gpu) {
            const renderPipeline = engine.gpu.createRenderPipeline(WaterRenderPipeline,
                {
                    frontFace: 'cw',
                    stripIndexFormat: 'uint16',
                    topology: 'triangle-strip',
                },
                {
                    stride: 3,
                });
            this.drawable = new DrawableSimple({
                node: this,
                renderPasses: undefined,
                renderPipeline,
                vertexBuffers: [
                    allocate_vec(Float32Array.of(
                        -50000.0,
                        3.0,
                        -50000.0,

                        50000.0,
                        3.0,
                        -50000.0,

                        -50000.0,
                        3.0,
                        50000.0,

                        50000.0,
                        3.0,
                        50000.0
                    ))
                ],
            });
        }
    }
}