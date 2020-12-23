

declare var DB: Promise<IDBDatabase>;

importScripts("/js/DB.js");
importScripts("/js/commonMath.js");
const numBlades = 70000;
const BLADE_WIDTH: number = 0.0025;
const BLADE_HEIGHT_MIN = 0.3
const BLADE_HEIGHT_MAX = 0.8
const buffer = new SharedArrayBuffer(2 * 4);
let grasspositions= new Float32Array(buffer);
let noises: Float32Array;
let bladecount: number = 0;
const cacheP = caches.open('save');
interface PlantI {
    family: string,
    pos: Float32Array,
    gridx: number,
    gridz: number,
    x: number,
    z: number,
    grid: string,
}
function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
const plantaes: PlantI[] = [];

let methods = {
    init: (data: WMessage<{ positions: SharedArrayBuffer, shape: any, noises: any }>) => {
        noises = new Float32Array(data.data.noises);
        this.postMessage({ id: data.id });
        caches.match(new Request('/grass')).then(async cachedgrass => {
            if (cachedgrass) {
                this.postMessage({ type: 'updated', buffer: await cachedgrass.arrayBuffer() });
            }
        })
    },
    growMemory: (size: number) => {
        console.log('grow memory to ', size)
        const buffer = new SharedArrayBuffer(size * 4);
        const newArray = new Float32Array(buffer);
        newArray.set(grasspositions);
        grasspositions = newArray
    },
    deGrowMemory: (data: WMessage<{ positions: SharedArrayBuffer }>) => {
        new Float32Array(data.data.positions,0,grasspositions.length).set(grasspositions);
        grasspositions = new Float32Array(data.data.positions);
    },
    save: async (data: WMessage<{ amount: number, angle: number, area: { size: any, coord: Float32Array } }>) => {
       // var d = new Date().getTime();
        let db = await DB;
        let trans = db.transaction("plantae");
      //  var objstore = trans.objectStore("plantae");
        let objs: PlantI[] = [];
        trans.onerror = function (err) {
            console.log(err)
        }
        let amount = data.data.amount;
        //console.log('creating grass, amount', amount, data)

        //let offsets: SharedArrayBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 3 * amount);
        let offsets = new Float32Array(amount * 2);

        const cos = Math.cos(data.data.angle);
        const sin = Math.sin(data.data.angle);

        let minX: number;
        let minZ: number;
        let maxX: number;
        let maxZ: number;
        for (let i = 0; i < amount; ++i) {
            let posX = (Math.random() * data.data.area.size.h * -1);
            let posZ = (Math.random() * data.data.area.size.w * -1);

            offsets[i * 2 + 0] = data.data.area.coord[0] + posX * cos + posZ * sin;
            offsets[i * 2 + 1] = data.data.area.coord[1] + posX * -sin + posZ * cos;
            if (i == 0) {
                maxX = minX = offsets[i * 2 + 0];
                maxZ = minZ = offsets[i * 2 + 1];
                if (isNaN(maxX) || isNaN(maxZ) || isNaN(minX) || isNaN(minZ)) {
                    console.log('maxX or maxZ is nan, i is', i);
                    continue;
                }
                continue;
            }
            //@ts-ignore
            maxX = Math.max(maxX, offsets[i * 2 + 0]);
            //@ts-ignore
            maxZ = Math.max(maxZ, offsets[i * 2 + 1]);
            //@ts-ignore
            minX = Math.min(minX, offsets[i * 2 + 0]);
            //@ts-ignore
            minZ = Math.min(minZ, offsets[i * 2 + 1]);

        }
        //let d2 = new Date().getTime();
        //const grids = new Set(plantaes.filter(v => (v.x > minX && v.x < maxX) && (v.z > minZ && v.z < maxZ)).map(v => v.grid));  //grid check is disabled now
        for (let i = 0; i < amount; i++) {
            let blade = [offsets[i * 2], offsets[i * 2 + 1]]
            let grid = (blade[0]) + ',' + (blade[1]);
           // if (!grids.has(grid)) { //grid check is disabled now
                plantaes.push({
                    family: 'Poaceae',
                    gridx: blade[0],
                    gridz: blade[1],
                    x: blade[0],
                    z: blade[1],
                    pos: new Float32Array(blade),
                    grid: grid,
                })
          //  }
        }
      //  bladecount = Math.min(Math.max(bladecount, plantaes.length), grasspositions.length/2)
        if (amount > grasspositions.length / 2) {
            methods.growMemory(amount*2)
        }


      //  bladecount = clamp(bladecount, plantaes.length, grasspositions.length / 2)
       	
       // for (let i = 0; i < Math.min(bladecount, plantaes.length); i++) {
        for (let i = 0; i < amount; i++) {

            grasspositions[i * 2] = plantaes[i].pos[0]
            grasspositions[i * 2 + 1] = plantaes[i].pos[1]
        }
        console.log('update grass, count', amount);
        this.postMessage({ type: 'updated', count: amount, buffer: grasspositions.buffer });
        
        const response = new Response(grasspositions);
        response.headers.set('content-length', grasspositions.buffer.byteLength.toString());
        response.headers.set('content-type', 'application/octet-stream');

        const cache = await cacheP;
        cache.put(new Request('/grass'), response);

    },
    get: async () => {
        let trans = (await DB).transaction(['plantae']);
        trans.objectStore('plantae').getAll().onsuccess = (evt) => {
            bladecount = Math.min((<IDBRequest>evt.target).result.length, grasspositions.length);
            trans.oncomplete = () => this.postMessage({ type: 'updated', count: bladecount })
            for (let i = 0; i < bladecount; i++) {
                let r = (<IDBRequest>evt.target).result[i];
                grasspositions.set(r.pos, i * 2);
            }
        }
    }
}
onmessage = async (e: WorkerMessage<{}>) => {
    methods[e.data.action](e.data);
}


