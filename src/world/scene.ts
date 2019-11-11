import { Sun } from "./sun.js";
import { WorkerThread, WorkerReturn } from "../WorkerThread.js";
import { Plants } from "../plants/Plants.js";
import { PlantsUI } from "../tools/plantsUI.js";
import { Zones } from "../tools/zones.js";
import { CameraTAB } from "../tools/camera.js";
import { UITAB } from "../UITAB.js";

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

        this.tools['CameraTAB'] = new CameraTAB(this, engine.getRenderingCanvas() , DB);
        //let ui = new UI();
        //ui.registerTab(CameraTab);
        var sunlight = new BABYLON.PointLight("Omni", this.SunObject.sunPosition, this);
        let shadermateria = new BABYLON.ShaderMaterial("shader", this, "./shaders/ground",
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "lightPos", "cameraPosition"]
            });
        // Data Map
        var nbPoints: number = 500;

        this.terrainReady = new Promise(async (res, rej) => {
            (await DB).transaction('maps').objectStore('maps').openCursor().onsuccess = function () {
                if (this.result) {

                }
            }
            let img = new Image();
            img.src = "/images/tenerife2.png";
            img.onerror = () => rej('Loading terrain image failed');
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
                let ground = new BABYLON.GroundMesh('ground', this);
                ground._subdivisionsX = 250;
                ground._subdivisionsY = 250;
                ground._width = img.width;
                ground._height = img.height;
                ground._maxX = ground._width / 2.0;
                ground._maxZ = ground._height / 2.0;
                ground._minX = -ground._maxX;
                ground._minZ = -ground._maxZ;
                let trans = (await DB).transaction('maps', 'readwrite').objectStore('maps').add({
                    width: img.width,
                    height: img.height,
                    indices: Uint32Array.from(vertexData.indices),
                    normals: Float32Array.from(vertexData.normals),
                    positions: Float32Array.from(vertexData.positions),
                    uvs: Float32Array.from(vertexData.uvs)
                });
                vertexData.applyToMesh(ground, true);
                ground._setReady(true);
                trans.onerror = rej;
                trans.onsuccess = () => {
                    res(ground)
                };
            }
            return;
            /*
            (await DB).transaction('maps').objectStore('maps').openCursor().onsuccess = function () {
                if (this.result) {
                    res(this.result.value.mapData);
                }
                else {
                    var mapData = new Float32Array(nbPoints * nbPoints * 3); // the array that will store the generated data
                    let img = new Image();
                    img.onload = () => {
                        let canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        let context = canvas.getContext("2d");
                        context.drawImage(img, 0, 0);
                        let buffer = context.getImageData(0, 0, img.width, img.height).data;

                        let x = 0.0;
                        let y = 0.0;
                        let z = 0.0;
                        let minHeight = -2;
                        let maxHeight = 150;
                        let filter = new BABYLON.Color3(0.3, 0.59, 0.11);
                        let subX = 500;
                        let subZ = 500
                        let offsetX = 0;
                        let offsetZ = 0;
                        for (let row = 0; row < subZ; row++) {
                            for (let col = 0; col < subX; col++) {
                                x = col * img.width / subX - img.width * 0.5;
                                z = row * img.height / subZ - img.height * 0.5;
                                let heightmapX = ((x + img.width * 0.5) / img.width * (img.width - 1)) | 0;
                                let heightmapY = (img.height - 1) - ((z + img.height * 0.5) / img.height * (img.height - 1)) | 0;
                                let pos = (heightmapX + heightmapY * img.width) * 4;
                                let gradient = (buffer[pos] * filter.r + buffer[pos + 1] * filter.g + buffer[pos + 2] * filter.b) / 255.0;
                                y = minHeight + (maxHeight - minHeight) * gradient;
                                let idx = (row * subX + col) * 3;
                                mapData[idx] = x + offsetX;
                                mapData[idx + 1] = y;
                                mapData[idx + 2] = z + offsetZ;
                            }
                        }
                        canvas.toBlob(b => {
                            let trans = this.transaction.db.transaction('maps', 'readwrite').objectStore('maps').add({
                                mapData: mapData,
                                image: b
                                //heightMap: buffer,
                            });
                            trans.onerror = rej;
                            trans.onsuccess = () => { res(mapData) };

                        }, 'image/png');

                    }
                    img.src = "images/tenerife2.png";
                }
            }*/
        });
        //@ts-ignore
        window.daa1 = this.terrainReady;
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
            var sea = BABYLON.Mesh.CreateGround("waterMesh", 10000, 10000, 1, this, false);
            //var seaground = BABYLON.Mesh.CreateGround("ground", 3601, 3601, 1, scene, false);
            //seaground.position.y = -1.5;
            sea.position.y = 0;
            let grass = new BABYLON.DynamicTexture("dynamic texture", { width: 10000, height: 10000 }, this, false);
            let plants = new Plants(this, (<CameraTAB>this.tools['CameraTAB']).camera, terrain);
            const DT: boolean = true
            DB.then(d => {
                console.log('Database ready');
                
                //this.tools['Plants'] = new PlantsUI(terrain, d, engine.getRenderingCanvas(), this,(<CameraTAB>this.tools['CameraTAB']).camera, sea, grass, plants);
                //this.tools['Zones'] = new Zones(terrain, d, engine.getRenderingCanvas(), shadermateria, this, (<CameraTAB>this.tools['CameraTAB']).camera, sea, grass);
                //ui.registerTab(ZoneTab);
                //ui.registerTab(plantsUI);
                
                shadermateria.setVector3("lightPos", sunlight.position);
                shadermateria.setVector3("cameraPosition",(<CameraTAB>this.tools['CameraTAB']).camera.position);
               
                if (DT) {
                    var ctx = grass.getContext();
                    ctx.beginPath();
                    ctx.fillStyle = "#3142e0";
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
                            else if (height > 0.3) {
                                ctx.fillStyle = "#e0e031";
                                ctx.fillRect(row, col * -1, 3, 3);
                            }
                        }
                    }
                }

                /*(function (name: string, texture: BABYLON.Texture): BABYLON.ShaderMaterial {
                    let me: BABYLON.ShaderMaterial = this;
                    if (me._options.samplers.indexOf(name) === -1) {
                        me._options.samplers.push(name);
                    }
                    me._textures[name] = texture;

                    return this;
                }).call(shadermateria, 'textureSampler2', grass)*/

                shadermateria.setTexture('textureSampler2', grass); //not working
                terrain.material = shadermateria;
                /* D.transaction('maps').objectStore('maps').openCursor().onsuccess = function () {
                    if (this.result) {
                        shadermateria.setTexture('heightMap', new BABYLON.RawTexture(await new Response(this.result.value.image).arrayBuffer() , 10000, 10000, BABYLON.Engine.TEXTUREFORMAT_RGB, scene, false, false, undefined, BABYLON.Engine.TEXTURETYPE_FLOAT));
                    }
                }*/
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


            engine.getRenderingCanvas().addEventListener("pointerdown", () => {
                var pickInfo = this.pick(this.pointerX, this.pointerY, (m) => {
                    return true;
                });
                console.log(pickInfo);
               /* var sphereLocalOrigin = BABYLON.MeshBuilder.CreateSphere("sphereLO", { diameter: .5 }, scene);
                sphereLocalOrigin.material = new BABYLON.StandardMaterial("origin", scene);
                sphereLocalOrigin.position = pickInfo.pickedPoint;
                sphereLocalOrigin.computeWorldMatrix();
             
                var matrix = sphereLocalOrigin.getWorldMatrix();
                let local_position = new BABYLON.Vector3(0, 1, 0);
                let global_position = BABYLON.Vector3.TransformCoordinates(local_position, matrix);
             
             
                if (pickInfo.hit) {
                    if (pickInfo.pickedMesh === sea) {
                        return;
                    }
                }
                //var ctx = grass.getContext();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.fillStyle = "brown";
                let centerX = 10000 / 2
                let centerZ = 10000 / 2
                ctx.beginPath();
                ctx.translate(centerX, centerZ);
              
                ctx.fillRect(global_position.x, global_position.z*-1, 21, 21);
                ctx.fill();
                grass.update();
                console.log(terrain.getHeightFromMap(global_position.x,global_position.z))*/
            }, false);



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