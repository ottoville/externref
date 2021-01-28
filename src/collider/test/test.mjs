import fs from 'fs'
import WASI from 'wasi'
const wasi = new WASI.WASI({
  args: process.argv,
  env: process.env
});

function Dot(left, right) {
    return (left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);
}

const importObject = {
    wasi_snapshot_preview1: wasi.wasiImport,
        console: {
                log: function (arg) {
                    console.log(arg);
                }
            } };

const wasm = await WebAssembly.compile(fs.readFileSync("../wwwroot/collider/colliderO.wasm"));
const instance = await WebAssembly.instantiate(wasm, importObject);

const memory=new Float32Array(instance.exports.memory.buffer)
const planeCollider=[0.025180285796523094, 0.9993657469749451, -0.025179903954267502, -145.06715393066406]
const velocity=[-3.84814453125,-217.21981811523438,-1.49462890625];
const normalizedVelocity=[-0.1100491123294244,-0.9199018225146004, 0.3763905283210806]
const basePoint=[-4030.13671875,211.58010864257812,-4133.25048828125]
const pointers=[17542392,17534360,17534328]
const vec1=[-4079.99951171875, 143.14511108398438, -4159.99951171875]
const vec2=[-3999.99951171875, 141.12940979003906, -4159.99951171875]
const vec3=[-4079.99951171875, 145.16078186035156, -4079.99951171875]
memory.set(vec1,17542392/4);
memory.set(vec2,17534360/4);
memory.set(vec3,17534328/4);

memory.set(planeCollider,21);
new Uint32Array(instance.exports.memory.buffer,21*4 + 4*4).set(pointers)
//memory.set(pointers,21+4);
memory.set(basePoint,21+7);
memory.set(velocity,21+10);
//dot: -0.02184537482799321
//signeddistancetoplane Should be:0.004813233371805836
//normaldotvelocity Should be:-0.10351959205490857
//planeintersectionpoint should be: -1946.251953125,165.83215016126633,2980.0702708978206
//checkpointsintriangle d should be -1082436.0262384948

//t (lowestroot): 0.79659551713961
//f -38.078174470045326
//nearestDistanceSquared: 14108.470703125

instance.exports._initialize((21+10)*4,(21+7)*4,1000)
console.log(instance.exports.testTriangles_unitTest(0,28));
//console.log(Dot(planeCollider,normalizedVelocity))
//wasi.start(instance);
