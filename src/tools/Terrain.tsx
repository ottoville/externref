import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
import { WorkerReturn, WorkerThread } from "../WorkerThread.js";
import { canvasListener } from "../traits/canvasListener.js";
import type { DrawableSimple } from "../GPU/Drawable.js";
import { TerraNodeGPU } from "../TerraNode.js";
import { Sea } from "../world/water.js";
import type { Trait } from "../traits/trait.js";
import type { Scene } from "../Scene.js";
import { ArcRotateCamera } from "../ArcRotateCamera.js";
import { RenderPipeline, Shader, VertexShader } from "../GPU/RenderPipeline.js";
import type { GPU } from "../GPU";
import { GPUBufferUsage } from "../gpu.js"
import { TerraVector3 } from "../Math.js";




const terrainWorker = new WorkerThread('/js/workers/webworkers/terrainWorker.js');


const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function getRenderPipeline(scene: Scene, terrain: Terrain) : RenderPipeline {

    let renderPipeline = renderPipelines.get(scene.gpu);
    if (renderPipeline) {
        return renderPipeline;
    }

    renderPipeline = terrain.TerrainHeightsbindGroupTree.addRenderPipeline(new VertexShader(scene.engine.gpu,"helper2.vert.wgsl"),new Shader(scene.engine.gpu,'UIColor.frag.wgsl'),{
        primitive: {
            topology: 'triangle-list',
            cullMode: 'none'
        }
    })
    renderPipelines.set(scene.gpu, renderPipeline);
    return renderPipeline
}

export class TerrainTool extends TerraNodeGPU<DrawableSimple> {
    static label = 'Terrain';
    public static instance: UITAB | null = null;
    static menuElem = (instance: TerrainTool) => <div><legend style="background-color:white">Terrain</legend>
        <button class="w3-bar-item w3-button" onClick={() => instance.raise()}>⇫</button>
        <button class="w3-bar-item w3-button" style="transform: rotate(-180deg);" onClick={() => instance.lower()} >⇫</button >
        </div>;
    traits:Set<Trait> = new Set();
    #canvasListener = new canvasListener(this);
    
    tempFacet1Buffer: (GPUCopySRCBuffer & GPUMapWriteBuffer) | null = null;
    tempFacet2Buffer: (GPUCopySRCBuffer & GPUMapWriteBuffer) | null = null;

    facet12ArrGPUBufferSwap = this.engine.gpu.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisions[0] * Terrain.subdivisions[1] * 4 * 2, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);
    readonly #facesOfVertices: number[][]=[]
    terrainPositionAndUvsAndNormalsCPUSwap: Float32Array;

    constructor(
        public scene:Scene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        public sea: Sea,
    ) {
        super(scene.engine, getRenderPipeline(scene, terrain),4,(node) => node.renderPipeline.addDrawableSimple(undefined, new Set([scene.gpu.renderPassScreen]), node, 8, 0,undefined,'TerrainTool'));
        scene.TerraCameras[0].subscribePickingRay();
        console.time('elevator')
        this.terrain.mesh.create_elevator();
        console.timeEnd('elevator');
        //TERRAIN EDITING DISABLED
        /*
        terrainWorker.message(WorkerReturn.Promise, 'init',
            {
                positionsAndNormals: terrain.mesh.verticesPositionBuffer,
                indices: terrain.indicesBuffer,
                subdivisionsX: Terrain.subdivisionsX,
                subdivisionsY: Terrain.subdivisionsY,
                //boundingBox: terrain.mesh.boundingBox.buffer,
                slopeArr: terrain.slopeArrBuffer,
                pickInfo: terrain.mesh.pickInfo.buffer,
                _groundFacesNormalsBuffer: terrain.mesh.facesBuffer,
                byteStride: 48,
                width:terrain.width,
                height:terrain.height
            });
*/

        // this.engine = sceneDeprecated.getEngine() as WebGPUEngine;


        this.#canvasListener.addListener("pointermove", this.#mouseListener, { lazy: 15 });




        this.terrainPositionAndUvsAndNormalsCPUSwap = this.terrain.mesh.verticesView();

        const faceCount = terrain.mesh.facesBuffer.byteLength / 4 / 4;
        for (let i = 0; i < faceCount; i++) {
            this.#groundFacesNormals.push(new Float32Array(terrain.mesh.facesBuffer, i << 4, 4))
        }
        const byteStride = terrain.mesh.verticesPositionStride*Float32Array.BYTES_PER_ELEMENT;
        if (this.#normalsView.length == 0) {
            for (let i = 0; i < terrain.mesh.positionCount; i++) {
                this.#positionsView.push(terrain.mesh.getPosition(i));
                this.#normalsView.push(new TerraVector3(this.engine.memory.buffer, this.terrain.mesh.vertices_pointer() + i * byteStride+16))
            }
        }

        
        let index: number;
        for (index = 0; index < terrain.mesh.positionCount; index++) {
            this.#facesOfVertices[index] = [];
        }
        terrain.indices.forEach((index, i)=> {
            this.#facesOfVertices[index]!.push((i / 3) | 0);
        });        
    }
    static saveTexture(arrayBuffer: ArrayBuffer, size: readonly [number,number]) {
        terrainWorker.message<ArrayBuffer, Transferable[]>(WorkerReturn.Promise, 'saveTexture', {buffer:arrayBuffer, size:size}, [arrayBuffer]);
    }
    //TERRAIN EDITING DISABLED
    private direction = 0;
    private mouseinterval = 0;

    #pointerdownf = (evt: PointerEvent): void => {
        if (evt.button !== 0) {
            return;
        }
        this.#canvasListener.addListener("pointerup", this.pointerupf, { once: true });
        this.camera.detachControl();
       
        this.mouseinterval = setInterval(() => {
            console.time('elevatFaces');
            this.elevateFaces(50,5,this.direction)
            console.timeEnd('elevatFaces');
            //TERRAIN EDITING DISABLED
            //terrainWorker.message(WorkerReturn.Promise, 'elevateFaces', { radius: 50, height: 5, direction: this.direction }).then(async e => {
                //const range = e as { min: number, max: number };
               // const length = range.max - range.min;

                //this.terrain.updateSwap2(range.min, length, this.terrain.mesh.verticesPositionBuffer)
            //});
        }, 17);
    }
    pointerupf = (): void => {
        this.camera.attachControl();
        clearInterval(this.mouseinterval);
    }
    destroy = (): void => {
        terrainWorker.unsubscribe('heights');
        this.Drawable.destroy();
        this.scene.TerraCameras[0].unSubscribePickingRay();
        this.facet12ArrGPUBufferSwap.destroy();
        this.traits.forEach(trait => trait.destroy());

        //There is only one mesh in this renderpipeline so destroy the pipeline and release its memory
        super.destroy();
        renderPipelines.delete(this.engine.gpu);
    };
    #pick:{ position: TerraVector3, meshId: number }={position:new TerraVector3(),meshId:0};
    #mouseListener = (): void => {
        /*this.terrain.mesh.intersectsRay(this.scene.TerraCameras[0].pickingRay).then(() => {
            this.SetTranslation([this.terrain.mesh.pickInfo.point[0], 0, this.terrain.mesh.pickInfo.point[2]]);
        });*/

        this.scene.pickPosition(pickInfo => {
            this.#pick.meshId=pickInfo.meshId;
            this.#pick.position=pickInfo.position.clone();
            this.SetTranslation([pickInfo.position[0], 0, pickInfo.position[2]]);
        });


    }
    raise = (): void => {
        //TERRAIN EDITING DISABLED
        this.direction = 1;
        this.#canvasListener.removeListener("pointerdown", this.#pointerdownf);
        this.#canvasListener.addListener("pointerdown", this.#pointerdownf);

    }
    lower = (): void => {
        //TERRAIN EDITING DISABLED
        this.direction = -1;
        this.#canvasListener.removeListener("pointerdown", this.#pointerdownf);
        this.#canvasListener.addListener("pointerdown", this.#pointerdownf);
    }


    #mousePosition:[number,number]=[0,0];
    #selectedVertices: { vertice: number, distance: number }[]=[]
    #groundFacesNormals: Float32Array[]=[];
    readonly #normalsView: Float32Array[] = [];
    readonly #positionsView: Float32Array[] = [];
    
    elevateFaces = (radius: number, height: number, direction: number):void => {
        //TODO: Move to init

        const heightMax = 500;
        const heightMin = -500;

        const terrainIndices = new Uint32Array(this.terrain.indicesBuffer);

        //if (isNaN(pickInfo.distance[0]))
        //    return;
        const length = this.terrainPositionAndUvsAndNormalsCPUSwap.length;

        // Impact zone
        if (this.#mousePosition[0] != this.#pick.position[0] || this.#mousePosition[1] != this.#pick.position[2]) {
            this.#mousePosition[0] = this.#pick.position[0];
            this.#mousePosition[1] = this.#pick.position[2];
            this.#selectedVertices = [];
    
            const radiusPow = Math.pow(radius, 2);
            
            for (let index = 0; index < length; index += 12) {
                const distance = Math.pow(this.terrainPositionAndUvsAndNormalsCPUSwap[index]! - this.#pick.position[0], 2) + Math.pow(this.terrainPositionAndUvsAndNormalsCPUSwap[index + 2]! - this.#pick.position[2], 2)
                if (distance < radiusPow) {
                    this.#selectedVertices.push({
                        vertice: index,
                        distance: Math.sqrt(distance)
                    });
                }
            }
        }
        // Elevate vertices
        const v1v2 = new Float32Array(3);
        const v3v2 = new Float32Array(3);
        let faceOfVertices: number[] = [];
        const half = this.#groundFacesNormals.length >> 1;
        let v1: Float32Array
        let v2: Float32Array
        let v3: Float32Array
    
    
        this.#selectedVertices.forEach(sv => {
            let positiony = this.terrainPositionAndUvsAndNormalsCPUSwap[sv.vertice + 1]!;
            var fullHeight = height * direction;
    
            if (sv.distance < radius * 0.3) {
                positiony += fullHeight;
            } else {
                positiony += fullHeight * (1.0 - (sv.distance - radius * 0.3) / (radius * 0.7));
            }
    
            if (positiony > heightMax)
                positiony = heightMax;
            else if (positiony < heightMin)
                positiony = heightMin;
            this.terrainPositionAndUvsAndNormalsCPUSwap[sv.vertice + 1] = positiony;
    
            faceOfVertices = this.#facesOfVertices[sv.vertice / 12]!;
    
            for (let index = 0; index < faceOfVertices.length; index++) {
                const indices = new Uint32Array(terrainIndices.buffer, (faceOfVertices[index]! * 3) << 2, 3);
    
                indices.forEach(vertexIndex => {
                    var faces = this.#facesOfVertices[vertexIndex]!;
                    const norm = this.#normalsView[vertexIndex]!;
                    norm.set([0, 0, 0]);
                    for (let index2 = 0; index2 < faces.length; index2++) {
                        if (faces[index2]! % 2 == 0) {
                            var facenormal = this.#groundFacesNormals[faces[index2]! >> 1]!;
                        } else {
                            var facenormal = this.#groundFacesNormals[half + (faces[index2]! >> 1)]!;
                        }
                        norm[0] += facenormal[0]!;
                        norm[1] += facenormal[1]!;
                        norm[2] += facenormal[2]!;
                    }
                    const fc = 1.0 / faces.length;
                    norm[0] *= fc;
                    norm[1] *= fc;
                    norm[2] *= fc;
                    //Normalize
                    const scale = 1 / Math.hypot(norm[0]!, norm[1]!, norm[2]!);
                    norm[0] *= scale;
                    norm[1] *= scale;
                    norm[2] *= scale;
                });
            }
        });
    
        this.#selectedVertices.forEach(sv => {
            faceOfVertices = this.#facesOfVertices[sv.vertice / 12]!;
            for (let index = 0; index < faceOfVertices.length; index++) {
                var indices = new Uint32Array(terrainIndices.buffer, (faceOfVertices[index]! * 3) << 2, 3);
    
                v1 = this.#positionsView[indices[0]!]!;
                v2 = this.#positionsView[indices[1]!]!;
                v3 = this.#positionsView[indices[2]!]!;
    
                v1v2[0] = v1[0]! - v2[0]!;
                v1v2[1] = v1[1]! - v2[1]!;
                v1v2[2] = v1[2]! - v2[2]!;
    
                v3v2[0] = v3[0]! - v2[0]!;
                v3v2[1] = v3[1]! - v2[1]!;
                v3v2[2] = v3[2]! - v2[2]!;
    
                if ((faceOfVertices[index]! & 1) == 0)
                    var normalized = this.#groundFacesNormals[half + (faceOfVertices[index]! >> 1)]!;
                else
                    var normalized = this.#groundFacesNormals[faceOfVertices[index]! >> 1]!;
                normalized[0] = v1v2[1]! * v3v2[2]! - v1v2[2]! * v3v2[1]!
                normalized[1] = v1v2[2]! * v3v2[0]! - v1v2[0]! * v3v2[2]!
                normalized[2] = v1v2[0]! * v3v2[1]! - v1v2[1]! * v3v2[0]!
    
                const scale = 1 / Math.hypot(normalized[0], normalized[1], normalized[2]);
                normalized[0] *= scale;
                normalized[1] *= scale;
                normalized[2] *= scale;
                normalized[3] = -(normalized[0] * v2[0]! + normalized[1] * v2[1]! + normalized[2] * v2[2]!);
            }
        })
    
        if (this.#selectedVertices.length) {
           /* self.postMessage({
                type: 'bounding', data: {
                    boundingBox: { minY: boundingBox.min[1], maxY: boundingBox.max[1] }
                }
            });*/
            const subvertices = this.#selectedVertices.map(sv => sv.vertice);
            const min = Math.min(...subvertices) * 4;
            const max = Math.max(...subvertices) * 4 + this.terrain.mesh.verticesPositionStride*Float32Array.BYTES_PER_ELEMENT;
          //  self.postMessage({ id: e.id, data: { min: min, max: max } });

                const length = max - min;

                this.terrain.updateSwap2(min, new Float32Array(this.terrainPositionAndUvsAndNormalsCPUSwap.buffer,this.terrainPositionAndUvsAndNormalsCPUSwap.byteOffset+min, length/4))

        }
    
    }
}