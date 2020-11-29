import type { GPU } from "./GPU";
import { BindGroupLayout } from "./GPU/BindGroupLayout";
import type { RenderPass } from "./GPU/RenderPass";
import type { ArcRotateCamera } from "./lib/babylon/Cameras/arcRotateCamera";
import { TerraCamera } from "./TerraCamera";

export class DebugScene {
    camera!: ArcRotateCamera;

    constructor(private window: Window, public canvas: HTMLCanvasElement, public gpuscene: GPU, public TerraCameras: TerraCamera[], onRenderStart?: (scene: DebugScene) => Promise<ArcRotateCamera>) {
        const renderPasses: Set<RenderPass> = new Set([gpuscene.renderPassScreen]);
        (async () => {
            onRenderStart && (this.camera = await onRenderStart(this));
            const renderLoop = function (time: DOMHighResTimeStamp) {

            }
        })
    }
    render(time: DOMHighResTimeStamp, renderEncoder:GPUCommandEncoder) {

    }
}