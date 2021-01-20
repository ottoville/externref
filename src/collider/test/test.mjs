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
const velocity=[-0.1953125, 0, -4.52960205078125];
const normalizedVelocity=[-0.043079101057668934, 0, -0.9990716646227452]
const basePoint=[-6658.89208984375, 273.1256103515625, 351.8554992675781]
memory.set([0.004787201061844826,0.9999885559082031,0,44.897769927978516]);
memory.set(normalizedVelocity,4);
memory.set(basePoint,7);
memory.set(velocity,10);
//signeddistancetoplane Should be:286.14279932177396
//normaldotvelocity Should be:-0.0009350002073915675
console.log(instance.exports.unitTest(0,4*4,7*4,10*4));
console.log(Dot([0.004787201061844826,0.9999885559082031,0,44.897769927978516], velocity))

wasi.start(instance);
