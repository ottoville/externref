import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
import { WorkerReturn, WorkerThread } from "../WorkerThread.js";
import { worldPosition, has3DPosition } from "../traits/worldPosition.js";
import { canvasListener } from "../traits/canvasListener.js";
import type { DrawableSimple } from "../GPU/Drawable.js";
import { TerraNode } from "../TerraNode.js";
import { Sea } from "../world/water.js";
import type { Trait } from "../traits/trait.js";
import type { Scene } from "../Scene.js";
import { ArcRotateCamera } from "../ArcRotateCamera.js";

const terrainWorker = new WorkerThread('../webworkers/terrainWorker.js');

export class TerrainTool extends TerraNode implements has3DPosition {
    public static instance: UITAB | null = null;
    traits:Set<Trait> = new Set();
    #canvasListener = new canvasListener(this);
    // private engine: WebGPUEngine;
    #helper!: DrawableSimple;

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
                _groundFacesNormalsBuffer: terrain.mesh.faces
            });


        // this.engine = sceneDeprecated.getEngine() as WebGPUEngine;

        this.worldPosition = new worldPosition(this);
        (async () => {
            const [fragment] = await Promise.all(['/shaders/wgsl/color.frag.wgsl'].map(async u => scene.gpu.device.createShaderModule({ code: await (await fetch(u)).text() })) as [Promise<GPUShaderModule>]);
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
            this.#helper = helperPipeline.addDrawableSimple(undefined, new Set([scene.gpu.renderPassScreen]), 4, 8, 0)
        })();

        this.#canvasListener.addListener("pointermove", this.#mouseListener, { lazy: 15 });

    }
    static saveTexture(arrayBuffer: ArrayBuffer) {
        terrainWorker.message<ArrayBuffer, Transferable[]>(WorkerReturn.Promise, 'saveTexture', arrayBuffer, [arrayBuffer]);
    }
    private direction = 0;
    private mouseinterval: number = 0;

    pointerdownf = (evt: PointerEvent): void => {
        if (evt.button !== 0) {
            return;
        }
        this.#canvasListener.addListener("pointerup", this.pointerupf, { once: true });
        this.camera.detachControl();
       
        this.mouseinterval = setInterval(() => {
            terrainWorker.message(WorkerReturn.Promise, 'elevateFaces', { radius: 50, height: 5, direction: this.direction }).then(async e => {
                let range = <{ min: number, max: number }><any>e;
                console.log('range', range)
                const length = range.max - range.min;

                this.terrain.updateSwap2(range.min, length)
            });
        }, 17);
    }
    pointerupf = (): void => {
        this.camera.attachControl();
        clearInterval(this.mouseinterval);
    }
    destroy = (): void => {
        terrainWorker.unsubscribe('heights');
        this.#helper.destroy();
        this.scene.TerraCameras[0].unSubscribePickingRay();
        this.facet12ArrGPUBufferSwap.destroy();
        this.traits.forEach(trait => trait.destroy());
    };

    #mouseListener = (): void => {
        this.terrain.mesh.intersectsRay(this.scene.TerraCameras[0].pickingRay).then(() => {
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