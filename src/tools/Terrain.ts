import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
import { WorkerReturn, WorkerThread } from "../WorkerThread.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import { worldPosition, has3DPosition } from "../traits/worldPosition.js";
import { canvasListener } from "../traits/canvasListener.js";
import type { Drawable } from "../GPU/Drawable.js";
import { TerraNode } from "../TerraNode.js";
import { Sea } from "../world/water.js";
import type { Trait } from "../traits/trait.js";
import type { Scene } from "../Scene.js";

const terrainWorker = new WorkerThread('../webworkers/terrainWorker.js');

export class TerrainTool extends TerraNode implements has3DPosition {
    public static instance: UITAB | null = null;
    traits:Set<Trait> = new Set();
    #canvasListener = new canvasListener(this);
    // private engine: WebGPUEngine;
    #helper!: Drawable;

    tempFacet1Buffer: (GPUCopySRCBuffer & GPUMapWriteBuffer) | null = null;
    tempFacet2Buffer: (GPUCopySRCBuffer & GPUMapWriteBuffer) | null = null;

    worldPosition: worldPosition;
    facet12ArrGPUBufferSwap = this.engine.gpu.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY * 4 * 2, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);

    constructor(
        public scene:Scene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        public sea: Sea,
    ) {
        super(scene.engine);
        scene.TerraCameras[0].subscribePickingRay();

        terrainWorker.message(WorkerReturn.Promise, 'init',
            {
                positionsAndNormals: terrain.terrainPositionAndUvsAndNormalsCPUSwap,
                indices: terrain.indicesBuffer,
                subdivisionsX: Terrain.subdivisionsX,
                subdivisionsY: Terrain.subdivisionsY,
                boundingBox: terrain.mesh.boundingBox,
                slopeArr: terrain.slopeArrBuffer,
                pickInfo: terrain.mesh.pickInfo.buffer,
                _groundFacesNormalsBuffer: terrain.facet12ArrCPUBuffer
            });


        // this.engine = sceneDeprecated.getEngine() as WebGPUEngine;

        this.worldPosition = new worldPosition(this);
        (async () => {
            const [fragment] = await Promise.all(['/shaders/wgsl/color.frag.wgsl'].map(async u => scene.gpu.device.createShaderModule({ code: await (await fetch(u)).text() })));
            const helperPipeline = terrain.TerrainHeightsbindGroupPositionTree.addRenderPipeline({
                primitiveTopology: 'triangle-strip',
                rasterizationState: {
                    cullMode: 'none',
                },
                depthStencilState: {
                    depthWriteEnabled: true,
                    depthCompare: "less",
                    format: "depth24plus-stencil8",
                },
                colorStates: [{
                    format: "bgra8unorm",
                }],
                vertexStage: {
                    module: scene.gpu.shaderModules.get("helper2.vert")!,
                    entryPoint: "main",
                },
                fragmentStage: {
                    module: fragment,
                    entryPoint: "main"
                },
                vertexState: {
                    indexFormat: 'uint32'
                }
            }, [this.bufferOffsetBytes]);
            this.#helper = helperPipeline.addDrawable(undefined, [scene.gpu.renderPassScreen], 4, 0, 8, 0, 0)
        })();

        this.#canvasListener.addListener("pointermove", this.#mouseListener, { lazy: 15 });

    }
    static saveTexture(arrayBuffer: ArrayBuffer) {
        terrainWorker.message<ArrayBuffer, Transferable[]>(WorkerReturn.Promise, 'saveTexture', arrayBuffer, [arrayBuffer]);
    }
    private direction = 0;
    private mouseinterval: number = 0;
    updateSwap2(offset = 0, length: number) {
        const b1 = this.engine.gpu.createGPUBuffer(length, [GPUBufferUsage.COPY_SRC], true);
        new Float32Array(b1.getMappedRange()).set(new Float32Array(this.terrain.terrainPositionAndUvsAndNormalsCPUSwap, offset, length / 4))
        b1.unmap();
        const b2 = this.engine.gpu.createGPUBuffer(this.terrain.facet12ArrCPUBuffer.byteLength, [GPUBufferUsage.COPY_SRC], true);
        new Float32Array(b2.getMappedRange()).set(this.terrain.facet12ArrCPUBufferView)
        b2.unmap();
        const commandEncoder = this.engine.gpu.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            b1, // source buffer
            0, //source offset
            this.terrain.terrainPositionAndUvsAndNormalsGPU, //destination buffer
            offset, //destination offset
            length);
        commandEncoder.copyBufferToBuffer(
            b2, // source buffer
            0, //source offset
            this.terrain.facet12ArrGPUBuffer, //destination buffer
            0, //destination offset
            this.terrain.facet12ArrCPUBuffer.byteLength);
        this.engine.gpu.device.defaultQueue.submit([commandEncoder.finish()]);
        b1.destroy();
        b2.destroy();
    }
    pointerdownf = (evt: PointerEvent): void => {
        if (evt.button !== 0) {
            return;
        }
        this.#canvasListener.addListener("pointerup", this.pointerupf, { once: true });
        this.camera.detachControl(this.engine.gpu.renderPassScreen.canvas);
       
        this.mouseinterval = setInterval(() => {
            terrainWorker.message(WorkerReturn.Promise, 'elevateFaces', { radius: 50, height: 5, direction: this.direction }).then(async e => {
                let range = <{ min: number, max: number }><any>e;
                console.log('range', range)
                const length = range.max - range.min;

                this.updateSwap2(range.min, length)
            });
        }, 17);
    }
    pointerupf = (evt: PointerEvent): void => {
        this.camera.attachControl(this.engine.gpu.renderPassScreen.canvas, true);
        clearInterval(this.mouseinterval);
    }
    destroy = (): void => {
        terrainWorker.unsubscribe('heights');
        this.#helper.destroy();
        this.scene.TerraCameras[0].unSubscribePickingRay();
        this.facet12ArrGPUBufferSwap.destroy();
        this.traits.forEach(trait => trait.destroy());
    };

    #mouseListener = (evt: PointerEvent): void => {
        this.terrain.mesh.intersects(this.scene.TerraCameras[0].pickingRay).then(() => {
            this.worldPosition.SetTranslation([this.terrain.mesh.pickInfo.point[0], 0, this.terrain.mesh.pickInfo.point[2]]);
        });
    }
    raise = (): void => {
        this.direction = 1;
        this.#canvasListener.removeListener("pointerdown", this.pointerdownf);
        console.log('add pointerdown listener');
        this.#canvasListener.addListener("pointerdown", this.pointerdownf);

    }
    lower = (): void => {
        this.direction = -1;
        this.#canvasListener.removeListener("pointerdown", this.pointerdownf);
        console.log('add pointerdown listener');
        this.#canvasListener.addListener("pointerdown", this.pointerdownf);
    }
}