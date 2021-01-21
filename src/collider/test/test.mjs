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

const wasm = await WebAssembly.compile(fs.readFileSync("../../../wwwroot/collider/colliderO.wasm"));
const instance = await WebAssembly.instantiate(wasm, importObject);

const memory=new Float32Array(instance.exports.memory.buffer)
const planeCollider=[0.0994977280497551,0.9872344136238098,-0.12437216192483902,-87.58885955810547]
const velocity=[-0.462890625,0,0.9068603515625];
const normalizedVelocity=[-0.4546314716756858,0,0.8906796421620964]
const basePoint=[1275.986083984375,191.6114501953125,1843.778076171875]
memory.set(planeCollider);
memory.set(normalizedVelocity,4);
memory.set(basePoint,7);
memory.set(velocity,10);
//signeddistancetoplane Should be:286.14279932177396
//normaldotvelocity Should be:-0.0009350002073915675

/*
    Planeintersectionpoint:
    0: 1275.8865862563252
    1: 190.6242157816887
    2: 1843.9024483337998
*/
instance.exports._initialize(4*4)
console.log(instance.exports.unitTest(0,7*4,10*4));

//wasi.start(instance);
