import { BoundableNodeSimple } from "../nodes/BoundableNodeSimple.js";
import type { Scene } from "../Scene.js";
import { DrawableSimple } from "../GPU/Drawables/DrawableSimple.js";
import { WaterRenderPipeline } from "../GPU/RenderPipeLines/Water.js";
import type { Engine } from "../engine.js";
import type { RenderPipeline } from "../GPU/RenderPipeline.js";
import type { WaterVertShader } from "../GPU/Shaders/Water.vert.js";
import { new_rust_mesh } from "../MainNode.js";
import { allocate_vec } from "../nodes/DataNode.js";
declare const engine: Engine;

export class Sea extends BoundableNodeSimple {
    drawable: DrawableSimple<RenderPipeline<WaterVertShader>> | undefined;
    override create_collider() {
        return engine.rust.create_cuboid_collider(50000, 3, 50000, 0, false);
    }
    constructor(scenes: Scene[]) {
        super(
            {
                vertices: {
                    view: allocate_vec(Float32Array.of(
                        -50000.0, 3.0, -50000.0,
                        50000.0, 3.0, -50000.0,
                        -50000.0, 3.0, 50000.0,
                        50000.0, 3.0, 50000.0
                    )),
                    stride: 3
                },
                can_collide: false,
            },
            new_rust_mesh({
                strip: true,
                label: 'water',
                scenes,
                fixed: true,
                rigid_body: false
            }),
            true
        ); //48
        if (engine.gpu) {
            const renderPipeline = engine.gpu.createRenderPipeline(WaterRenderPipeline, {
                topology: 'triangle-strip',
                stripIndexFormat: 'uint16',
                frontFace: 'cw'
            });
            this.drawable = new DrawableSimple({
                renderPipeline,
                vertexBuffers: [
                    new Float32Array([
                        -50000.0, 3.0, -50000.0,
                        50000.0, 3.0, -50000.0,
                        -50000.0, 3.0, 50000.0,
                        50000.0, 3.0, 50000.0
                    ]),
                ],
                renderPasses: undefined,
                node: this,
            });
        }
    }
}