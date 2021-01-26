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
const planeCollider=[-0.10015051066875458, 0.9937114119529724, 0.05007525533437729, -781.2051391601562]
const velocity=[-3.0244140625, -25.281112670898438, 10.3441162109375];
const normalizedVelocity=[-0.1100491123294244,-0.9199018225146004, 0.3763905283210806]
const basePoint=[-6079.8310546875, 194.50743103027344, -400.68804931640625]
const pointers=[17542392,17534360,17534328]
const vec1=[-6080, 193.53724670410156, -400]
const vec2=[-6080, 189.50587463378906, -320]
const vec3=[-6160, 181.44313049316406, -320]
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

//t (lowestroot): 0.007563536178771672

instance.exports._initialize(10*4,7*4)
console.log(instance.exports.unitTest(0));
//console.log(Dot(planeCollider,normalizedVelocity))
//wasi.start(instance);
