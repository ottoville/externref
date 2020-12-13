import { Engine } from "./engine";
import type { GPU } from "./GPU";

import type { ArcRotateCamera } from "./lib/babylon/Cameras/arcRotateCamera";
import { Scene } from "./Scene";
import { TerraCamera } from "./TerraCamera";

export class DebugScene extends Scene {
    camera!: ArcRotateCamera;

    constructor(engine: Engine, public canvas: HTMLCanvasElement, gpu: GPU, TerraCameras: TerraCamera[], onRenderStart: (scene: Scene, sunBufferOffsetBytes: number) => void) {
        super(gpu, engine, TerraCameras, onRenderStart)
    }
}