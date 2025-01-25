import fs from 'fs';
import assert from 'node:assert/strict';
import WASI from 'wasi';
const wasi = new WASI.WASI({
  args: process.argv,
  env: process.env,
  version: 'preview1',
});

let instanceRust;
const textDecoder = new TextDecoder();

export function stringFromPtr(
  memory,
  ptr,
) {
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error('Webassembly module does not have memory');
  }
  const [s_ptr, len] = new Uint32Array(memory.buffer, ptr, 2);
  return textDecoder.decode(new Uint8Array(memory.buffer, s_ptr, len));
}
const exportObj = {
  console: {
    log(ptr) {
      console.log(stringFromPtr(instanceRust.exports.memory, ptr));
    },
    log_str(ptr, length) {
      console.log(
        textDecoder.decode(
          new Uint8Array(
            (instanceRust.exports.memory).buffer,
            ptr,
            length,
          ),
        ),
      );    },
    warn(ptr) {},
    error(ptr) {},
  },
  env: {
    now() {
      return performance.now();
    },
    jspanic(ptr) {
      if (!(instanceRust.exports.memory instanceof WebAssembly.Memory)) {
        throw new Error('Webassembly module does not have memory');
      }
      console.error(
        new TextDecoder()
          .decode(new Uint8Array(instanceRust.exports.memory.buffer, ptr, 512))
          .trimEnd(),
      );
    },
    jslog(ptr) {
      if (!(instanceRust.exports.memory instanceof WebAssembly.Memory)) {
        throw new Error('Webassembly module does not have memory');
      }
      console.log(
        new TextDecoder()
          .decode(new Uint8Array(instanceRust.exports.memory.buffer, ptr, 512))
          .trimEnd(),
      );
    },
    jslog_number(number) {
      console.log(number);
    },
    mesh_on_physic_tick(mesh_id) {},
    mesh_on_change() {},
    verticesChange() {},
    render_renderpasses() {},
    drop_ref() {},
  },
  queue: {
    submit() {},
  },
  camera: {
    on_update_position() {},
  },
  commandencoder: {
    create_gpu_command_encoder() {},
    finish() {},
    begin_compute_pass() {},
    copy_buffer_to_buffer() {},
  },
  computepassencoder: {
    set_pipeline() {},
    set_bindgroup() {},
    dispatch_workgroups() {},
    end() {},
  },
  buffer: {
    set_mapped_range() {},
    unmap() {},
    write() {},
    map_write_async() {},
    map_state() {},
  },
  device: {
    create_bind_group() {},
    create_gpu_buffer() {},
  },
};

const wasmRust = await WebAssembly.compile(
  fs.readFileSync('../../wwwroot/engine.wasm'),
);
instanceRust = await WebAssembly.instantiate(wasmRust, exportObj);

const importObject = {
  wasi_snapshot_preview1: wasi.wasiImport,
  console: {
    log: function (arg) {
      console.log(arg);
    },
    error: function (line) {
      console.error('Some error in webassembly on line', line);
      throw new Error('Some error in webassembly on line ' + line);
    },
  },
  rust: instanceRust.exports,
  env: {
    memory: instanceRust.exports.memory,
  },
};
const wasm = await WebAssembly.compile(
  fs.readFileSync('../../wwwroot/collider/colliderSimd.wasm'),
);
const instance = await WebAssembly.instantiate(wasm, importObject);

const memory = instance.exports.memory;

//memory.set(pointers,21+4);

//dot: -0.02184537482799321
//signeddistancetoplane Should be:0.004813233371805836
//normaldotvelocity Should be:-0.10351959205490857
//planeintersectionpoint should be: -1946.251953125,165.83215016126633,2980.0702708978206
//checkpointsintriangle d should be -1082436.0262384948

//t (lowestroot): 0.79659551713961
//f -38.078174470045326
//nearestDistanceSquared: 14108.470703125

const collider_ptr = instanceRust.exports.collider();

const velocity = new Float32Array(
  memory.buffer,
  instanceRust.exports.scaled_velocity_pointer(collider_ptr),
  4,
);
velocity.set([3.71044921875, -174.03759765625, -0.5966796875]);
const position = new Float32Array(
  memory.buffer,
  instanceRust.exports.scaled_position_pointer(collider_ptr),
  4,
);

position.set([3384.10498046875, 143.2760772705078, -5874.26806640625]);

instance.exports.construct(
  instanceRust.exports.collision_resolved_pointer(collider_ptr),
  instanceRust.exports.nearest_distance_squared_pointer(collider_ptr),
  instanceRust.exports.collided_mesh_pointer(collider_ptr),
  velocity.byteOffset,
  position.byteOffset,
  instanceRust.exports.collided_point_in_triangle_pointer(collider_ptr),
  collider_ptr,
  instanceRust.exports.lowest_root_pointer(collider_ptr),
);

instance.exports._initialize();

const collisionNotFound = new Uint32Array(
  memory.buffer,
  instanceRust.exports.collision_resolved_pointer(collider_ptr),
  1,
);
const nearestDistanceSquared = new Float32Array(
  memory.buffer,
  instanceRust.exports.nearest_distance_squared_pointer(collider_ptr),
  1,
);

new Float32Array(memory.buffer, 7872, 4).set([
  0, 31.435291290283203, -10000, 0,
]);
new Float32Array(memory.buffer, 7888, 4).set([
  10000, 3.8745102882385254, -10000, 0,
]);
new Float32Array(memory.buffer, 7824, 4).set([0, 3.8745102882385254, 0, 0]);

new Float32Array(memory.buffer, 7776, 4).set([0, 0, 0, 0]);
new Float32Array(memory.buffer, 7760, 4).set([0, 0, 0, 0]);
new Float32Array(memory.buffer, 7808, 4).set([0, 0, 0, 0]);
new Float32Array(memory.buffer, 7840, 4).set([0, 0, 0, 0]);
new Float32Array(memory.buffer, 7792, 4).set([0, 0, 0, 0]);
new Float32Array(memory.buffer, 7792, 4).set([0, 0, 0, 0]);
new Float32Array(memory.buffer, 7856, 4).set([0, 0, 0, 0]);

const data = [
  //norm +d
  2147483648, 1065353216, 0, 3229087738,
  //vectors
  7824, 7776, 7760,
  //norm + d
  0, 1065353216, 0, 3229087738,
  //vectors
  7808, 7824, 7760,
  //norm + d
  3162570751, 1065351136, 0, 3229085723,
  //vectors
  7840, 7792, 7776,
  //norm + d
  3162570751, 1065351136, 0, 3229085723,
  //vectors
  7824, 7840, 7776,
  //norm +d
  2147483648, 1065353152, 993304356, 3229087676,
  //vectors
  7872, 7824, 7808, 0, 1065353152, 993304356, 3229087676, 7856, 7872, 7808,
  3162569703, 1065349056, 3162569703, 3229083709, 7888, 7840, 7824, 993304311,
  1065353089, 993304311, 3229087615, 7872, 7888, 7824,
];
const facesBufferCollider = new Uint32Array(memory.buffer, 60, data.length);
facesBufferCollider.set(data);
const facesBufferColliderFloats = new Float32Array(
  memory.buffer,
  60,
  data.length,
);
const facesBufferColliderParallel = new Float32Array(
  memory.buffer,
  60 + facesBufferCollider.byteLength,
  32,
);

facesBufferColliderParallel.set([
  facesBufferColliderFloats[0],
  facesBufferColliderFloats[7],
  facesBufferColliderFloats[14],
  facesBufferColliderFloats[21],
  facesBufferColliderFloats[1],
  facesBufferColliderFloats[8],
  facesBufferColliderFloats[15],
  facesBufferColliderFloats[22],
  facesBufferColliderFloats[2],
  facesBufferColliderFloats[9],
  facesBufferColliderFloats[16],
  facesBufferColliderFloats[23],
  facesBufferColliderFloats[3],
  facesBufferColliderFloats[10],
  facesBufferColliderFloats[17],
  facesBufferColliderFloats[24],

  facesBufferColliderFloats[28],
  facesBufferColliderFloats[35],
  facesBufferColliderFloats[42],
  facesBufferColliderFloats[49],
  facesBufferColliderFloats[29],
  facesBufferColliderFloats[36],
  facesBufferColliderFloats[43],
  facesBufferColliderFloats[50],
  facesBufferColliderFloats[30],
  facesBufferColliderFloats[37],
  facesBufferColliderFloats[44],
  facesBufferColliderFloats[51],
  facesBufferColliderFloats[31],
  facesBufferColliderFloats[38],
  facesBufferColliderFloats[45],
  facesBufferColliderFloats[52],
]);

instance.exports.testTriangles(
  facesBufferCollider.byteOffset,
  facesBufferColliderParallel.byteOffset,
  facesBufferCollider.byteLength,
  8 * 7 * 4,
);
if (!collisionNotFound[0] === 0) {
  console.error('faulty collisionNotFound', collisionNotFound);
  process.exit(1);
}
const intersectionPointWasm = new Float32Array(
  instanceRust.exports.memory.buffer,
  instanceRust.exports.intersection_point_pointer(collider_ptr),
  4,
);
assert.deepEqual(
  [...intersectionPointWasm],
  [3386.90673828125, 10.731124877929688, -5874.72216796875, 0],
);

if (nearestDistanceSquared[0] !== 17312.142578125) {
  console.error('faulty nearesDistanceSquared', nearestDistanceSquared[0]);
  process.exit(1);
}
///////////////////////////////////////////////

instance.exports.test_checkForLowestRoot2();

assert.deepEqual(
  [
    ...new Float32Array(
      memory.buffer,
      instanceRust.exports.collision_point_pointer(collider_ptr),
      4,
    ),
  ],
  [312.5, 65.6070785522461, -343.26318359375, 2.2420775429197073e-44],
);

//console.log(Dot(planeCollider,normalizedVelocity))
//wasi.start(instance);
