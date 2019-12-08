import { Sun } from "./sun.js";
import { WorkerThread, WorkerReturn } from "../WorkerThread.js";
import { Plants } from "../plants/Plants.js";
import { PlantsUI } from "../tools/plantsUI.js";
import { Zones } from "../tools/zones.js";
import { CameraTAB } from "../tools/camera.js";
import { UITAB } from "../UITAB.js";
import { BuildingsUI } from "../tools/buildings.js";
import { Terrain } from "../tools/Terrain.js";

//import { UI } from "../UI.js";

export class WorldScene extends BABYLON.Scene {
    private gameSpeed = BigInt(0);
    private lastStateChangeGameTime = BigInt(21600 * 1000); //6 hours
    private lastStateChangeTime = new Date().getTime();

    /*public getGameTime(): bigint {
        if (this.gameSpeed < 0)
            return this.lastStateChangeGameTime;
        let interval = new Date().getTime() - this.lastStateChangeTime;
        return this.lastStateChangeGameTime + (BigInt(interval * 60) << this.gameSpeed);
    }*/
    public currentGameTime: number;
    public SunObject: Sun;
    public terrainReady: Promise<BABYLON.GroundMesh>;
    public stateChange(data) {
        console.log('state changed', data);
        if (this.webSocket) {
            this.webSocket.send(JSON.stringify({ action: 'stateChange', data }))
        return;
       /* this.lastStateChangeGameTime = this.getGameTime();
        this.lastStateChangeTime = new Date().getTime();
        this.gameSpeed = BigInt((<HTMLInputElement>evt.target).value);*/
        let gameStateEvent = {
            speed: Number(this.gameSpeed),
            lastStateChangeGameTime: Number(this.lastStateChangeGameTime),
            lastStateChangeTime: this.lastStateChangeTime
        };
        }
        //gameEngine.message(WorkerReturn.Promise, 'stateChange', gameStateEvent);
    };
    public tools: { [index: string]: UITAB } = {}
    constructor(engine: BABYLON.Engine, userinfo: loginProvider, public blazor: DotNet.BlazorInstance, ticks: number, private webSocket?: WebSocket) {
        super(engine);
        if (webSocket) {
            this.webSocket.send(JSON.stringify({ action: 'init', data: { userinfo, ticks } }));
            this.webSocket.onmessage = (e) => {
                let msg = JSON.parse(e.data);
                if (msg.action == 'init') {
                    console.log('going to init game', msg.currentPlayData)
                    blazor.invokeMethod('initGame', msg.currentPlayData);
                }
            }
        } else {
            console.log('initing without websocket connection');
            blazor.invokeMethod('initGame', {
                gameSpeed: 0,
                lastStateChangeGameTime: 216000000000,
                lastStateChangeTime: ticks
            });
        }
        this.SunObject = new Sun(this);



       /* let gameEngine = new WorkerThread('js/workers/engine.js');
        gameEngine.message(WorkerReturn.noReturn, 'init', {
            gameTime: this.lastStateChangeGameTime
        });*/

        this.tools['CameraTAB'] = new CameraTAB(this, engine.getRenderingCanvas(), DB);
        
        //let ui = new UI();
        //ui.registerTab(CameraTab);
        var sunlight = new BABYLON.PointLight("Omni", this.SunObject.sunPosition, this);
        let shadermateria = new BABYLON.ShaderMaterial("shader", this, "./shaders/ground",
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "lightPos", "cameraPosition"]
            });
        interface TerrainMap {
            width: number,
            height: number,
            indices: Uint32Array,
            normals: Float32Array,
            positions: Float32Array,
            uvs: Float32Array,
            texture: Blob
        }
        const DT: boolean = true;
        let sea: BABYLON.Mesh;
        this.terrainReady = new Promise(async (ccres, ccrej) => {
            let db = (await DB);
            let trans = db.transaction('maps');
            trans.onerror = ccrej;
            trans.objectStore('maps').openCursor().onsuccess = (evt) => {
                if ((<IDBRequest>evt.target).result) {
                    console.log('callback1');
                    ccres((<IDBRequest>evt.target).result.value);
                }
                else {
                    let img = new Image();
                    img.src = "/images/tenerife2.png";
                    img.onerror = () => ccrej('Loading terrain image failed');
                    img.onload = async () => {
                        let canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        let context = canvas.getContext("2d");
                        context.drawImage(img, 0, 0);
                        let buffer = <Uint8Array>(<any>context.getImageData(0, 0, img.width, img.height).data);
                        var vertexData = VERTEX_CreateGroundFromHeightMap({
                            width: img.width, height: img.height,
                            subdivisions: 250,
                            minHeight: -2, maxHeight: 250, colorFilter: new BABYLON.Color3(0.3, 0.59, 0.11),
                            buffer: buffer, bufferWidth: img.width, bufferHeight: img.height,
                            alphaFilter: 0.0
                        });
                        let obj = {
                            width: img.width,
                            height: img.height,
                            indices: Uint32Array.from(vertexData.indices),
                            normals: Float32Array.from(vertexData.normals),
                            positions: Float32Array.from(vertexData.positions),
                            uvs: Float32Array.from(vertexData.uvs)
                        };
                        let trans2 = db.transaction('maps', 'readwrite');
                        trans2.onerror = ccrej;
                        trans2.objectStore('maps').add(obj).onsuccess = () => {
                            trans2.objectStore('maps').openCursor().onsuccess = (e) => {                                
                                ccres(<IDBCursorWithValue>(<IDBRequest>e.target).result.value)
                            }
                        }
                    }
                }
            };
        }).then((vdata: TerrainMap) => {
            console.log('creating ground', vdata);
            let ground = new BABYLON.GroundMesh('ground', this);
            ground._subdivisionsX = 250;
            ground._subdivisionsY = 250;
            ground._width = vdata.width;
            ground._height = vdata.height;
            ground._maxX = ground._width / 2.0;
            ground._maxZ = ground._height / 2.0;
            ground._minX = -ground._maxX;
            ground._minZ = -ground._maxZ;
            var vertexData = new BABYLON.VertexData();

            vertexData.indices = vdata.indices;
            vertexData.positions = vdata.positions;
            vertexData.normals = vdata.normals;
            vertexData.uvs = vdata.uvs;

            vertexData.applyToMesh(ground, true);
            ground._setReady(true);

            sea = BABYLON.Mesh.CreateGround("waterMesh", 10000, 10000, 1, this, false);
            let plants = new Plants(this, (<CameraTAB>this.tools['CameraTAB']).camera, ground);
            this.tools['Terrain'] = new Terrain(this, ground, (<CameraTAB>this.tools['CameraTAB']).camera);
            let gl: WebGLRenderingContext = engine._gl;
            /*ground._draw = function (subMesh: BABYLON.SubMesh, fillMode: number, instancesCount?: number): BABYLON.Mesh {
                if (!this._geometry || !this._geometry.getVertexBuffers() || (!this._unIndexed && !this._geometry.getIndexBuffer())) {
                    return this;
                }
                if (this._internalMeshDataInfo._onBeforeDrawObservable) {
                    this._internalMeshDataInfo._onBeforeDrawObservable.notifyObservers(this);
                }
                engine.applyStates();
                engine._drawCalls.addCount(1, false);
                gl.drawElements(gl.TRIANGLE_FAN, vertexData.indices.length, gl.UNSIGNED_SHORT, 0);
                return this;
            };*/


            shadermateria.setVector3("lightPos", sunlight.position);
            shadermateria.setVector3("cameraPosition", (<CameraTAB>this.tools['CameraTAB']).camera.position);
            new Promise((tres, trej) => {
                if (typeof (vdata.texture) === 'undefined') {
                    let c = document.createElement('canvas');
                    c.width = 10000;
                    c.height = 10000;
                    let ctx = c.getContext("2d");
                    ctx.beginPath();
                    ctx.fillStyle = "#e0e031";
                    ctx.fillRect(0, 0, 10000, 10000);

                    var centerX = 10000 / 2
                    var centerZ = 10000 / 2
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.translate(centerX, centerZ);
                    for (let row = -2500; row < 2500; row = row + 2) {
                        for (let col = -2500; col < 2500; col = col += 2) {
                            let height = ground.getHeightAtCoordinates(row, col)
                            if (height > 3) {
                                ctx.fillStyle = "green";
                                ctx.fillRect(row, col * -1, 3, 3);
                            }
                        }
                    }
                    c.toBlob(async b => {
                        vdata.texture = b;
                        tres(b);
                        (await DB).transaction('maps', 'readwrite').objectStore('maps').put(vdata);
                    }, 'image/webp', 1);
                } else
                    tres(vdata.texture);
            }).then((b: Blob) => {
                let img = new Image();
                img.onload = () => {
                    let width = 10000;
                    let rtexture2 = { //https://github.com/BabylonJS/Babylon.js/blob/f287a1ea59027b97cb917850a5079c2e03d8fce4/src/Materials/Textures/internalTexture.ts
                        _engine:engine,
                        _source:3,
                        _webGLTexture: gl.createTexture()
                    }

                    //engine.updateRawTexture(rtexture2, imagedata.data, BABYLON.Engine.TEXTUREFORMAT_RGBA, true, null, BABYLON.Constants.TEXTURETYPE_UNSIGNED_INT);
                    //@ts-ignore
                    engine._bindTextureDirectly(gl.TEXTURE_2D, rtexture2, true);
                    //gl.bindTexture(gl.TEXTURE_2D, ntexture);
                    engine._unpackFlipY(true);
                    if (width % 4 !== 0) {
                        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
                    }
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);

                    var filters = engine._getSamplingParameters(BABYLON.Constants.TEXTURE_TRILINEAR_SAMPLINGMODE, false);

                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filters.mag);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filters.min);


                    engine._bindTextureDirectly(gl.TEXTURE_2D, null);
                    //gl.bindTexture(gl.TEXTURE_2D, null);
                 //   engine._internalTexturesCache.push(rtexture2);


                    (function () {
                        this._options.samplers.push('groundTexture');
                        //@ts-ignore
                        this._textures['groundTexture'] = <BABYLON.Texture>{
                            getInternalTexture: () => rtexture2, //(<BABYLON.InternalTexture>{ _associatedChannel: -1 }), //rtexture2,
                            isReady: () => true,
                            wrapU: BABYLON.Texture.CLAMP_ADDRESSMODE,
                            wrapV: BABYLON.Texture.CLAMP_ADDRESSMODE
                        };
                        return this;
                    }).bind(shadermateria)();
                    ground.material = shadermateria;
                    this.tools['Plants'] = new PlantsUI(ground, engine.getRenderingCanvas(), this, (<CameraTAB>this.tools['CameraTAB']).camera, sea, plants);
                }
                img.src = URL.createObjectURL(b);


                //let groundtexture = new BABYLON.Texture(URL.createObjectURL(b), this, undefined, undefined, undefined, undefined, (e) => { throw (e) });
                //shadermateria.setTexture('groundTexture', groundtexture);
               

                //this.tools['Plants'] = new PlantsUI(ground, engine.getRenderingCanvas(), this, (<CameraTAB>this.tools['CameraTAB']).camera, sea, groundtexture, plants);
            });

            return ground
        });
        this.terrainReady.catch((e) => {
            console.error('creating terrain failed', e);
        })
        this.terrainReady.then((terrain: BABYLON.GroundMesh) => {
            console.log('terrain is ready');
            /* Promise.all([CSG.fromMesh(this.mesh), CSG.fromMesh(grassbox)]).then(r => {
                 if (thismeshoperation !== meshoperatiocount) {
                     r[0].dispose();
                     r[1].dispose();
                     return;
                 }
                 r[0].intersect(r[1]).then(newcsg => {
                     r[0].dispose();
                     r[1].dispose();
                     if (thismeshoperation !== meshoperatiocount) {
                         
                         newcsg.dispose();
                         return;
                     }
                     newcsg.toMesh("unined", brown, scene, true).then(newmesh => {
                         newcsg.dispose();
                         if (typeof (oldmesh) !== 'undefined') {
                             if (thismeshoperation !== meshoperatiocount) {
                                 newmesh.dispose();
                                 return;
                             }
                             oldmesh.dispose();
                         }
                         oldmesh = newmesh;
                         newmesh.position.y += 4;
                     });
                 });
             })*/
            /*   var aCSG = BABYLON.CSG.FromMesh(terrain);
    
               var bCSG = BABYLON.CSG.FromMesh(grassbox);
    
               
               let unioned=aCSG.intersect(bCSG); //SLOW
               if (typeof (oldmesh) !== 'undefined')
                 oldmesh.dispose();
               let newmesh=unioned.toMesh("unined",brown,scene,true);
               oldmesh = newmesh;
               newmesh.position.y+=4;*/

            /*   }
           }, scene);*/

            // canvas.addEventListener("pointerdown", DZ.mainPointerDown, false);
            terrain.isPickable = true;
            
            //var seaground = BABYLON.Mesh.CreateGround("ground", 3601, 3601, 1, scene, false);
            //seaground.position.y = -1.5;
            sea.position.y = 0;
            
            this.tools['Buildings'] = new BuildingsUI(this);
            
            DB.then(d => {
                console.log('Database ready');
                
                
                this.tools['Zones'] = new Zones(terrain, d, shadermateria, this, (<CameraTAB>this.tools['CameraTAB']).camera, sea);
                //ui.registerTab(ZoneTab);
                //ui.registerTab(plantsUI);
                

               /* let c = document.createElement('canvas');
                c.width = 10000;
                c.height = 10000;
                let ctx = c.getContext("2d");
                if (DT) {
                    ctx.beginPath();
                    ctx.fillStyle = "#e0e031";
                    ctx.fillRect(0, 0, 10000, 10000);

                    var centerX = 10000 / 2
                    var centerZ = 10000 / 2
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.translate(centerX, centerZ);
                    for (let row = -2500; row < 2500; row = row + 2) {
                        for (let col = -2500; col < 2500; col = col += 2) {
                            let height = terrain.getHeightAtCoordinates(row, col)
                            if (height > 3) {
                                ctx.fillStyle = "green";
                                ctx.fillRect(row, col * -1, 3, 3);
                            }
                        }
                    }
                }           
                c.toBlob(b => {

                    let groundtexture = new BABYLON.Texture(URL.createObjectURL(b), this, undefined, undefined, undefined, undefined, (e) => { throw (e) })
                    shadermateria.setTexture('textureSampler2', groundtexture); //not working
                    terrain.material = shadermateria;
                    this.tools['Plants'] = new PlantsUI(terrain, engine.getRenderingCanvas(), this, (<CameraTAB>this.tools['CameraTAB']).camera, sea, groundtexture, plants);
                   
                }, 'image/webp');*/
            })
            var waterMaterial = new BABYLON.WaterMaterial("waterMaterial", this, new BABYLON.Vector2(512, 512));
            waterMaterial.bumpTexture = new BABYLON.Texture("images/waterbump.png", this);
            waterMaterial.windForce = -10;
            waterMaterial.waveHeight = 0.4;
            waterMaterial.bumpHeight = 0.1;
            waterMaterial.waveLength = 0.1;
            waterMaterial.waveSpeed = 50.0;
            waterMaterial.colorBlendFactor = 0;
            waterMaterial.windDirection = new BABYLON.Vector2(1, 1);
            waterMaterial.colorBlendFactor = 0;
            waterMaterial.addToRenderList(terrain);
            sea.material = waterMaterial;


            terrain.checkCollisions = true;
            var green = new BABYLON.StandardMaterial("green", this);
            
            green.diffuseColor = new BABYLON.Color3(0, 1, 0);
            

          /*  BABYLON.SceneLoader.ImportMesh("", "", "tree.babylon", this, function (mesh) {
                let treemesh = mesh[0];
                (<BABYLON.StandardMaterial>treemesh.material).opacityTexture = null;
                treemesh.material.backFaceCulling = false;
                treemesh.isVisible = false;
                if (DT) {
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.translate(centerX, centerZ);
                    ctx.fillStyle = "#654321";
                }
                for (let row = -5000; row < 5000; row = row + 8) {
                    for (let col = -5000; col < 5000; col = col += 8) {
                        let height = terrain.getHeightFromMap(row, col)
                        //let height = ground.getHeightAtCoordinates(row, col);
                        if (height > 40 && height < 110) {
                            let newInstance = (<BABYLON.Mesh>treemesh).createInstance("i" + row.toString() + col.toString());
                            newInstance.position.z = col + 8 * Math.random();
                            newInstance.position.x = row + 8 * Math.random();
                            newInstance.position.y = height;
                            newInstance.rotate(BABYLON.Axis.Y, Math.random() * Math.PI * 2, BABYLON.Space.WORLD);
    
                            var scale = 0.5 + Math.random() * 2;
                            newInstance.scaling.addInPlace(new BABYLON.Vector3(scale, scale, scale));
                            DT && ctx.fillRect(row, col * -1, 10, 10);
                        }
                    }
                }
                if (DT) {
                    ctx.fill();
                    grass.update();
                }


                return this;
            });*/

            let buildings: BABYLON.Mesh[] = [];

            let size = 10000
            /* DB.then(db => {
                 let centerX = size / 2
                 let centerZ = size / 2
                 window.setInterval(() => {
                     db.transaction("zones").objectStore("zones").getAll().onsuccess = function (evt) {
                         this.result.forEach(z => {
                             let height = terrain.getHeightFromMap(row, col)
                             let width = 50;
                             let depth = 50;
    
                             let box = BABYLON.MeshBuilder.CreateBox("myBox", {
                                 height: 20,
                                 width,
                                 depth
                             }, scene);
                             box.position.x = z.coord.x;
                             box.position.z = z.coord.z * -1;
                             // for (let i = 0; i < buildings.length; i++) {
                               //   if (box.intersectsMesh(buildings[i], true)) {
                              //        box.position.x++;
                              //        i = 0;
                              //    }
                             // }
                             buildings.push(box);
                         })
                     }
                 }, 1000)
    
             });*/

        }).catch(e => console.log(e));
    }
}
function VERTEX_CreateGroundFromHeightMap(options: { width: number, height: number, subdivisions: number, minHeight: number, maxHeight: number, colorFilter: BABYLON.Color3, buffer: Uint8Array, bufferWidth: number, bufferHeight: number, alphaFilter: number }): BABYLON.VertexData {
    var indices = [];
    var positions = [];
    var normals = [];
    var uvs = [];
    var row, col;
    var filter = options.colorFilter || new BABYLON.Color3(0.3, 0.59, 0.11);
    var alphaFilter = options.alphaFilter || 0.0;
    var invert = false;

    if (options.minHeight > options.maxHeight) {
        invert = true;
        let temp = options.maxHeight;
        options.maxHeight = options.minHeight;
        options.minHeight = temp;
    }

    // Vertices
    for (row = 0; row <= options.subdivisions; row++) {
        for (col = 0; col <= options.subdivisions; col++) {
            var position = new BABYLON.Vector3((col * options.width) / options.subdivisions - (options.width / 2.0), 0, ((options.subdivisions - row) * options.height) / options.subdivisions - (options.height / 2.0));

            // Compute height
            var heightMapX = (((position.x + options.width / 2) / options.width) * (options.bufferWidth - 1)) | 0;
            var heightMapY = ((1.0 - (position.z + options.height / 2) / options.height) * (options.bufferHeight - 1)) | 0;

            var pos = (heightMapX + heightMapY * options.bufferWidth) * 4;
            var r = options.buffer[pos] / 255.0;
            var g = options.buffer[pos + 1] / 255.0;
            var b = options.buffer[pos + 2] / 255.0;
            var a = options.buffer[pos + 3] / 255.0;

            if (invert) {
                r = 1.0 - r;
                g = 1.0 - g;
                b = 1.0 - b;
            }

            var gradient = r * filter.r + g * filter.g + b * filter.b;

            // If our alpha channel is not within our filter then we will assign a 'special' height
            // Then when building the indices, we will ignore any vertex that is using the special height
            if (a >= alphaFilter) {
                position.y = options.minHeight + (options.maxHeight - options.minHeight) * gradient;
            }
            else {
                position.y = options.minHeight - BABYLON.Epsilon; // We can't have a height below minHeight, normally.
            }

            // Add  vertex
            positions.push(position.x, position.y, position.z);
            normals.push(0, 0, 0);
            uvs.push(col / options.subdivisions, 1.0 - row / options.subdivisions);
        }
    }

    // Indices
    for (row = 0; row < options.subdivisions; row++) {
        for (col = 0; col < options.subdivisions; col++) {
            // Calculate Indices
            var idx1 = (col + 1 + (row + 1) * (options.subdivisions + 1));
            var idx2 = (col + 1 + row * (options.subdivisions + 1));
            var idx3 = (col + row * (options.subdivisions + 1));
            var idx4 = (col + (row + 1) * (options.subdivisions + 1));

            // Check that all indices are visible (based on our special height)
            // Only display the vertex if all Indices are visible
            // Positions are stored x,y,z for each vertex, hence the * 3 and + 1 for height
            var isVisibleIdx1 = positions[idx1 * 3 + 1] >= options.minHeight;
            var isVisibleIdx2 = positions[idx2 * 3 + 1] >= options.minHeight;
            var isVisibleIdx3 = positions[idx3 * 3 + 1] >= options.minHeight;
            if (isVisibleIdx1 && isVisibleIdx2 && isVisibleIdx3) {
                indices.push(idx1);
                indices.push(idx2);
                indices.push(idx3);
            }

            var isVisibleIdx4 = positions[idx4 * 3 + 1] >= options.minHeight;
            if (isVisibleIdx4 && isVisibleIdx1 && isVisibleIdx3) {
                indices.push(idx4);
                indices.push(idx1);
                indices.push(idx3);
            }
        }
    }

    // Normals
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    // Result
    var vertexData = new BABYLON.VertexData();

    vertexData.indices = indices;
    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    return vertexData;
};