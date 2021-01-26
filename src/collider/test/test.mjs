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
const planeCollider=[-0,0.9996827244758606,0.025188086554408073,-241.8369903564453]
const velocity=[-0.447998046875, 0, -0.780517578125];
const normalizedVelocity=[-0.49780328265518553, 0, -0.8672899698357647]
const basePoint=[-1946.251953125, 166.8318328857422, 2980.095458984375]
const pointers=[17542392,17534360,17534328]
const vec1=[4880.0009765625,-1.9843136072158813,9680]
const vec2=[4880.0009765625,-4,9760]
const vec3=[4800.0009765625,-4,9760]
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

instance.exports._initialize(10*4,7*4)
console.log(instance.exports.unitTest(0));
//console.log(Dot(planeCollider,normalizedVelocity))
//wasi.start(instance);
