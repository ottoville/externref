

declare var DB: Promise<IDBDatabase>;

importScripts("/js/DB.js");
importScripts("/js/commonMath.js");
const numBlades = 70000;
const BLADE_WIDTH: number = 0.0025;
const BLADE_HEIGHT_MIN = 0.3
const BLADE_HEIGHT_MAX = 0.8
let grasspositions: Float32Array;
let noises: Float32Array;
let bladecount: number = 0;
interface PlantI {
    id?: number,
    family: string,
    pos: Float32Array,
    gridx: number,
    gridz: number,
    x: number,
    z: number,
    grid: string,
}
let methods = {
    init: (data: WMessage<{ positions: any, shape: any, noises: any }>) => {
        console.log('init plants worker');
        grasspositions = new Float32Array(data.data.positions);
        noises = new Float32Array(data.data.noises);
        this.postMessage({ id: data.id });
    },
    save: async (data: WMessage<{ amount: number, angle: number, area: { size: any, coord: any } }>) => {
        console.log('data', data)
        var d = new Date().getTime();
        let db = await DB;
        let trans = db.transaction("plantae");
        var objstore = trans.objectStore("plantae");
        let objs: PlantI[] = [];
        trans.onerror = function (err) {
            console.log(err)
        }
        let amount = data.data.amount;
        console.log('creating grass, amount', amount, data)

        //let offsets: SharedArrayBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 3 * amount);
        let offsets = new Float32Array(amount * 2);
        var rotmax = rotateMatrix(data.data.angle, "y");
        let minX: number;
        let minZ: number;
        let maxX: number;
        let maxZ: number;
        for (let i = 0; i < amount; ++i) {
            let posX = (Math.random() * data.data.area.size.h * -1);
            let posZ = (Math.random() * data.data.area.size.w * -1);

            let translated = translate(posX, 0, posZ, rotmax);

            const [x, z] = [data.data.area.coord.x + translated.x, data.data.area.coord.y + translated.z]


            offsets[i * 2 + 0] = x;
            offsets[i * 2 + 1] = z;
            if (i == 0) {
                maxX = minX = offsets[i * 2 + 0];
                maxZ = minZ = offsets[i * 2 + 1];
                if (isNaN(maxX) || isNaN(maxZ) || isNaN(minX) || isNaN(minZ)) {
                    console.log('maxX or maxZ is nan, i is', i);
                    continue;
                }
                continue;
            }
            maxX = Math.max(maxX, offsets[i * 2 + 0]);
            maxZ = Math.max(maxZ, offsets[i * 2 + 1]);
            minX = Math.min(minX, offsets[i * 2 + 0]);
            minZ = Math.min(minZ, offsets[i * 2 + 1]);

        }
        let d2 = new Date().getTime();

        console.log('min maxx ,', minX, maxX);
        objstore.index('x').getAll(IDBKeyRange.bound(minX, maxX)).onsuccess = (ee) => {
            console.log('PROMISE FILLED2, took ', new Date().getTime() - d2);
            //objstore.index('grid').getAll(IDBKeyRange.bound(mingrid, maxgrid)).onsuccess = (ee) => {
            console.log('start procesing query results, took ', new Date().getTime() - d);
            let results: PlantI[] = (<IDBRequest>ee.target).result;
            let grids = new Set(results.filter(v => (v.z > minZ && v.z < maxZ)).map(v => v.grid));
            console.log('grids mapped, took ', new Date().getTime() - d);
            for (let i = 0; i < amount; i++) {
                let blade = [offsets[i * 2], offsets[i * 2 + 1]]
                let grid = (blade[0] | 1) + ',' + (blade[1] | 1);
                if (!grids.has(grid)) {
                    objs.push({
                        family: 'Poaceae',
                        gridx: blade[0] | 1,
                        gridz: blade[1] | 1,
                        x: blade[0],
                        z: blade[1],
                        pos: new Float32Array(blade),
                        grid: grid,
                    })
                }
            }
            bladecount = Math.min(Math.max(bladecount, objs.length), grasspositions.length)
            //	console.log('Start to process objs length, ', objs.length, ', took ', new Date().getTime() - d);
            for (let i = 0; i < Math.min(bladecount, objs.length); i++) {
                grasspositions.set(objs[i].pos, i * 2);
            }
            console.log('sending grass back from worker, bladecount ', bladecount, 'took ', new Date().getTime() - d);
            this.postMessage({ type: 'updated', count: bladecount });
            let transs = db.transaction("plantae", 'readwrite');
            transs.onerror = function (err) {
                console.log(err)
            };
            //let objstore2 = transs.objectStore("plantae");
            console.log('grass count', objs.length);
            let counter = 0;
            (function insert(transs) {
                console.log('batching 5000 grass, length is ', objs.length);
                let objstore2 = transs.objectStore("plantae")
                while (objs.length) {
                    let obj = objs.pop();
                    counter++;
                    objstore2.add(obj);
                    if (objs.length % 5000 == 0 && objs.length) {
                        console.log('register another batch');

                        transs.oncomplete = () => {
                            transs = db.transaction("plantae", 'readwrite');
                            transs.onerror = function (err) {
                                console.log(err)
                            }
                            insert(transs);
                        }
                        methods.get()
                        return;
                    }
                }
                transs.oncomplete = () => {
                    console.log('grass count2', counter, 'sending grass back from worker2, took ', new Date().getTime() - d);
                    methods.get()
                }
            })(transs);
        }
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


