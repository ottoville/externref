import fs from 'fs'
import WASI from 'wasi'
const wasi = new WASI.WASI({
  args: process.argv,
  env: process.env
});


const memoryImport = new WebAssembly.Memory({ initial: 600 });
const importObject = {
    wasi_snapshot_preview1: wasi.wasiImport,
        console: {
                log: function (arg) {
                    console.log(arg);
                }
               
            }, env: {
                memory: memoryImport
            }
         };

const wasm = await WebAssembly.compile(fs.readFileSync("../wwwroot/collider/colliderO.wasm"));
const instance = await WebAssembly.instantiate(wasm, importObject);

const memory=instance.exports.memory.buffer

//memory.set(pointers,21+4);

//dot: -0.02184537482799321
//signeddistancetoplane Should be:0.004813233371805836
//normaldotvelocity Should be:-0.10351959205490857
//planeintersectionpoint should be: -1946.251953125,165.83215016126633,2980.0702708978206
//checkpointsintriangle d should be -1082436.0262384948

//t (lowestroot): 0.79659551713961
//f -38.078174470045326
//nearestDistanceSquared: 14108.470703125

const collisionNotFound=new Uint32Array(memory,0,1);
const intersectionPointWasm=new Float32Array(memory,4,4);
const nearestDistanceSquared=new Float32Array(memory, 20, 1);
const collidedMesh=new Uint32Array(memory,24,1);
instance.exports.construct(collisionNotFound.byteOffset, intersectionPointWasm.byteOffset, nearestDistanceSquared.byteOffset, collidedMesh.byteOffset);

const velocity=new Float32Array(memory,28, 4)
velocity.set([3.71044921875, -174.03759765625, -0.5966796875]);
const position=new Float32Array(memory,44, 4)
position.set([3384.10498046875, 143.2760772705078, -5874.26806640625]);
instance.exports._initialize(velocity.byteOffset, position.byteOffset);

new Float32Array(memory, 7872,4).set([0, 31.435291290283203, -10000, 0]);
new Float32Array(memory, 7888,4).set([10000, 3.8745102882385254, -10000, 0]);
new Float32Array(memory, 7824,4).set([0, 3.8745102882385254, 0, 0]);

const data=[2147483648, 1065353216, 0, 3229087738, 7824, 7776, 7760, 0, 1065353216, 0, 3229087738, 7808, 7824, 7760, 3162570751, 1065351136, 0, 3229085723, 7840, 7792, 7776, 3162570751, 1065351136, 0, 3229085723, 7824, 7840, 7776, 2147483648, 1065353152, 993304356, 3229087676, 7872, 7824, 7808, 0, 1065353152, 993304356, 3229087676, 7856, 7872, 7808, 3162569703, 1065349056, 3162569703, 3229083709, 7888, 7840, 7824, 993304311, 1065353089, 993304311, 3229087615, 7872, 7888, 7824];
const facesBufferCollider=new Uint32Array(memory,60, data.length);
facesBufferCollider.set(data);

instance.exports.testTriangles(facesBufferCollider.byteOffset, facesBufferCollider.byteLength,8*7*4);
if(!collisionNotFound[0]===0) {
    console.error('faulty collisionNotFound',collisionNotFound)
    process.exit(1)
}
if(intersectionPointWasm[0]!==3386.90673828125 || intersectionPointWasm[1] !== 10.731124877929688 || intersectionPointWasm[2] !== -5874.72216796875) {
    console.error('faulty intersectionPointWasm',intersectionPointWasm)
    process.exit(1)
}
if(nearestDistanceSquared[0] == 17312.14453125) {
    console.error('faulty nearesDistanceSquared',nearestDistanceSquared[0])
    process.exit(1)
}

//console.log(Dot(planeCollider,normalizedVelocity))
//wasi.start(instance);
