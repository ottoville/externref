

declare var DB: Promise<IDBDatabase>;

importScripts('/js/DB.js');
const numBlades = 70000;
const BLADE_WIDTH = 0.0025;
const BLADE_HEIGHT_MIN = 0.3
const BLADE_HEIGHT_MAX = 0.8
const buffer = new SharedArrayBuffer(2 * 4);
let grasspositions = new Float32Array(buffer);
let noises: Float32Array;
let bladecount = 0;
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
const grids2: Map<string, number[]> = new Map()
const methods = {
    deGrowMemory: (data: WMessage<{ positions: SharedArrayBuffer }>) => {
        new Float32Array(data.data.positions, 0, grasspositions.length).set(grasspositions);
        grasspositions = new Float32Array(data.data.positions);
    },
    get: async () => {
        const trans = (await DB).transaction(['plantae']);
        trans.objectStore('plantae').getAll().onsuccess = (evt) => {
            bladecount = Math.min((<IDBRequest>evt.target).result.length, grasspositions.length);
            trans.oncomplete = () => globalThis.postMessage({ count: bladecount, type: 'updated', })
            for (let i = 0; i < bladecount; i++) {
                const r = (<IDBRequest>evt.target).result[i];
                grasspositions.set(r.pos, i * 2);
            }
        }
    },
    growMemory: (size: number) => {
        //console.log('grow memory to ', size)
        const newArray = new Float32Array(new SharedArrayBuffer(size * 4));
        newArray.set(grasspositions);
        grasspositions = newArray;
    },
    init: (data: WMessage<{ positions: SharedArrayBuffer }>) => {
        globalThis.postMessage({ id: data.id, });
        caches.match(new Request('/grass')).then(response => {
            if (response) {
                return response.arrayBuffer();
            } else {
                return fetch('/assets/grass').then(response2 => response2.arrayBuffer())
            }
        }).then(arrayBuffer => {
            globalThis.postMessage({ buffer: arrayBuffer, type: 'updated', });
        }).catch(e => {
            console.error('Error in web worker', e)
        })
    },
    save: async (data: WMessage<{ angle: number, area: { size: { width: number, height: number }, coord: Float32Array } }>) => {
        const grassPerSquareMeter = 8
        const amount = Math.abs(data.data.area.size.height * data.data.area.size.width) * grassPerSquareMeter
        if (amount === 0)
            return;
        // var d = new Date().getTime();
        //  var objstore = trans.objectStore("plantae");

        //console.log('creating grass, amount', amount, data)

        //let offsets: SharedArrayBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 3 * amount);
        const offsets = new Float32Array(amount * 2);

        const cos = Math.cos(data.data.angle);
        const sin = Math.sin(data.data.angle);

        /*  let minX: number;
          let minZ: number;
          let maxX: number;
          let maxZ: number;*/


        for (let i = 0; i < amount; ++i) {
            const posX = (Math.random() * data.data.area.size.height * -1);
            const posZ = (Math.random() * data.data.area.size.width * -1);
            const offsetsX = data.data.area.coord[0] + posX * cos + posZ * sin
            const offsetsY = data.data.area.coord[1] + posX * -sin + posZ * cos
            offsets[i * 2 + 0] = offsetsX;
            offsets[i * 2 + 1] = offsetsY;
            const grid = (offsetsX | 0) + ',' + (offsetsY | 0);
            let gridarr = grids2.get(grid);
            if (!gridarr) {
                gridarr = [];
                grids2.set(grid, gridarr)
            }
            if (gridarr.length > grassPerSquareMeter * 2)
                continue;
            gridarr.push(offsetsX, offsetsY);

        }

        /* if (amount > grasspositions.length / 2) {
             methods.growMemory(amount * 2)
         }*/
        let memoryOffset = 0;
        grids2.forEach(grid => {
            if (memoryOffset + grid.length > grasspositions.length)
                methods.growMemory(memoryOffset + grid.length)
            grasspositions.set(grid, memoryOffset);
            memoryOffset += grid.length;
        });
        /*
        for (let i = 0; i < amount; i++) {
            let blade = [offsets[i * 2], offsets[i * 2 + 1]];

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
        }*/
        //  bladecount = Math.min(Math.max(bladecount, plantaes.length), grasspositions.length/2)



        //  bladecount = clamp(bladecount, plantaes.length, grasspositions.length / 2)

        // for (let i = 0; i < Math.min(bladecount, plantaes.length); i++) {
        /*   for (let i = 0; i < amount; i++) {

               grasspositions[i * 2] = plantaes[i].pos[0]
               grasspositions[i * 2 + 1] = plantaes[i].pos[1]
           }*/
        console.log('update grass, count', grasspositions.length / 2);
        globalThis.postMessage({ buffer: grasspositions.buffer, count: grasspositions.length / 2, type: 'updated', });

        const response = new Response(grasspositions);
        response.headers.set('content-length', grasspositions.buffer.byteLength.toString());
        response.headers.set('content-type', 'application/octet-stream');

        const cache = await cacheP;
        cache.put(new Request('/grass'), response);

    },
}
onmessage = (e: WorkerMessage) => {
    //@ts-expect-error
    methods[e.data.action](e.data);
}


