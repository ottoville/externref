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
const planeCollider=[ -0.07516003400087357,0.9943349361419678,-0.07516003400087357,-773.678466796875]
const velocity=[-0.0556640625,-16.710113525390625, -0.01806640625];
const normalizedVelocity=[-0.1100491123294244,-0.9199018225146004, 0.3763905283210806]
const basePoint=[-5664.44482421875,32.938724517822266,-4324.76513671875]
const pointers=[17542392,17534360,17534328]
const vec1=[-5600, 22.203922271728516, -4399.99951171875, 0]
const vec2=[-5600, 28.2509822845459, -4319.99951171875, 0]
const vec3=[-5680, 22.203922271728516, -4319.99951171875, 0]
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
