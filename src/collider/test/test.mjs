import fs from 'fs'
import WASI from 'wasi'
const wasi = new WASI.WASI({
  args: process.argv,
  env: process.env
});

function Dot(left, right) {
    return (left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);
}

const importObject = { wasi_snapshot_preview1: wasi.wasiImport };

const wasm = await WebAssembly.compile(fs.readFileSync("../wwwroot/collider/colliderO.wasm"));
const instance = await WebAssembly.instantiate(wasm, importObject);

const memory=new Float32Array(instance.exports.memory.buffer)
const planeCollider=[0.02490527182817459,0.9884583353996277,-0.14943163096904755,-639.5983276367188]
const velocity=[-5.98779296875,-225.3956298828125,1.7177734375];
const normalizedVelocity=[-0.1100491123294244,-0.9199018225146004, 0.3763905283210806]
const basePoint=[-3976.2060546875, 232.89031982421875,-3823.5654296875]
const pointers=[17542392,17534360,17534328]
const vec1=[-3999.99951171875, 167.33334350585938, -3839.99951171875]
const vec2=[-3919.99951171875, 165.31765747070312, -3839.99951171875]
const vec3=[-3999.99951171875, 179.42745971679688, -3759.99951171875]
memory.set(vec1,17542392/4);
memory.set(vec2,17534360/4);
memory.set(vec3,17534328/4);

memory.set(planeCollider);
new Uint32Array(instance.exports.memory.buffer,4*4).set(pointers)
//memory.set(pointers,4);
memory.set(basePoint,7);
memory.set(velocity,10);
//dot: -0.02184537482799321
//signeddistancetoplane Should be:0.004813233371805836
//normaldotvelocity Should be:-0.10351959205490857
//planeintersectionpoint should be: -1946.251953125,165.83215016126633,2980.0702708978206
//checkpointsintriangle d should be -1082436.0262384948

//t (lowestroot): 0.79659551713961
//f -38.078174470045326
//nearestDistanceSquared: 788.0773160549195

instance.exports._initialize(10*4,7*4)
console.log(instance.exports.unitTest(0));
//console.log(Dot(planeCollider,normalizedVelocity))
//wasi.start(instance);
