import { Engine } from "./engine";
import type { GPU } from "./GPU";
import { BindGroupLayout } from "./GPU/BindGroupLayout";
import type { RenderPass } from "./GPU/RenderPass";
import type { ArcRotateCamera } from "./lib/babylon/Cameras/arcRotateCamera";
import { Scene } from "./Scene";
import { TerraCamera } from "./TerraCamera";

export class DebugScene extends Scene {
    camera!: ArcRotateCamera;

    constructor(engine: Engine, public canvas: HTMLCanvasElement, gpu: GPU, TerraCameras: TerraCamera[], onRenderStart: (scene: Scene) => void) {
        super(gpu, engine, TerraCameras, onRenderStart)
        const renderPasses: Set<RenderPass> = new Set([gpu.renderPassScreen]);
    }
    render(time: DOMHighResTimeStamp, renderEncoder:GPUCommandEncoder) {

    }
}