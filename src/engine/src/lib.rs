extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Engine {
    meshes: Vec<GPUMesh>,
    gpu_slots: Vec<u32>,
    gpu_queue: Vec<(*const GPUMesh, u32)>,
    gpu_next_available_address: u32,
}

const GPU_ALIGNMENT: u32 = 256;

//const GPU_QUEUE: Vec<(* const GPUMesh, u32)> = Vec::new();
const MESHES: Vec<*const Mesh> = Vec::new();
#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let e = Engine {
            meshes: Vec::new(),
            gpu_next_available_address: 0,
            gpu_slots: Vec::new(),
            gpu_queue: Vec::new(),
        };
        return e;
    }
    fn allocate_gpu(&mut self) -> u32 {
        let o = self.gpu_slots.pop();
        match o {
            None => {
                let r = self.gpu_next_available_address;
                self.gpu_next_available_address += 1;
                return r
            }
            Some(i) => i,
        }
    }
    fn de_allocate_gpu(&mut self, address: u32) {
        if address == self.gpu_next_available_address - 1 {
            self.gpu_next_available_address -= 1;
            loop {
                let max_used_address=self.gpu_next_available_address - 1;
                if self.gpu_slots.iter().max() == Some(&max_used_address) {
                    self.gpu_slots.pop();
                    self.gpu_next_available_address = max_used_address;
                } else {
                    break;
                }
            }
        } else {
            self.gpu_slots.push(address);
        }
    }
}
pub struct Rotation {
    x: f32,
    y: f32,
    z: f32,
    w: f32,
}
pub struct Scale {
    x: f32,
    y: f32,
    z: f32,
}
#[wasm_bindgen]
pub struct Mesh {
    engine: *mut Engine,
    gpu_alignment: u32,
    gpu_mesh: GPUMesh,
    rotation: Rotation,
    scaling: Scale,
}
#[wasm_bindgen]
impl Mesh {
    pub fn update_scale(&mut self, x: f32, y: f32, z: f32) {
        self.scaling.x = x;
        self.scaling.y = y;
        self.scaling.z = z;
        self.update_matrix();
        unsafe {
            let engine = &mut *self.engine;
            engine.gpu_queue.push((&self.gpu_mesh, 1));
        }
        // GPU_QUEUE.push((&self.gpu_mesh,1))
    }
    pub fn update_rotation(&mut self, x: f32, y: f32, z: f32, w: f32) {
        self.rotation.x = x;
        self.rotation.y = y;
        self.rotation.z = z;
        self.rotation.w = w;
        self.update_matrix();
        unsafe {
            let engine = &mut *self.engine;
            engine.gpu_queue.push((&self.gpu_mesh, 1));
        }
    }
    #[wasm_bindgen(getter)]
    pub fn gpu_pointer(&self) -> *const f32 {
        (&self.gpu_mesh).transformation.as_ptr()
    }
    #[wasm_bindgen(getter)]
    pub fn gpu_alignment(&self) -> u32 {
        self.gpu_alignment
    }
    #[wasm_bindgen(getter)]
    pub fn rotation_pointer(&self) -> *const Rotation {
        &self.rotation
    }
    #[wasm_bindgen(getter)]
    pub fn scaling_pointer(&self) -> *const Scale {
        &self.scaling
    }
    #[wasm_bindgen(constructor)]
    pub fn new(engine: &mut Engine) -> Self {
        let m = Mesh {
            engine: engine,
            gpu_alignment: engine.allocate_gpu(),
            gpu_mesh: GPUMesh::new(),
            rotation: Rotation {
                x: 0.0,
                y: 0.0,
                z: 0.0,
                w: 0.0,
            },
            scaling: Scale {
                x: 1.0,
                y: 1.0,
                z: 1.0,
            },
        };
        MESHES.push(&m);
        return m;
    }
    pub fn update_matrix(&mut self) {
        let x: f32 = self.rotation.x;
        let y: f32 = self.rotation.y;
        let z: f32 = self.rotation.z;
        let w: f32 = self.rotation.w;

        let x2: f32 = x + x;
        let y2: f32 = y + y;
        let z2: f32 = z + z;

        let xx: f32 = x * x2;
        let xy: f32 = x * y2;
        let xz: f32 = x * z2;

        let yy: f32 = y * y2;
        let yz: f32 = y * z2;
        let zz: f32 = z * z2;
        let wx: f32 = w * x2;
        let wy: f32 = w * y2;
        let wz: f32 = w * z2;

        let sx = self.scaling.x;
        let sy = self.scaling.y;
        let sz = self.scaling.z;
        self.gpu_mesh.transformation[0] = (1.0 - (yy + zz)) * sx;
        self.gpu_mesh.transformation[1] = (xy + wz) * sx;
        self.gpu_mesh.transformation[2] = (xz - wy) * sx;
        self.gpu_mesh.transformation[4] = (xy - wz) * sy;
        self.gpu_mesh.transformation[5] = (1.0 - (xx + zz)) * sy;
        self.gpu_mesh.transformation[6] = (yz + wx) * sy;

        self.gpu_mesh.transformation[8] = (xz + wy) * sz;
        self.gpu_mesh.transformation[9] = (yz - wx) * sz;
        self.gpu_mesh.transformation[10] = (1.0 - (xx + yy)) * sz;
    }
}

#[repr(align(8))]
pub struct GPUMesh {
    transformation: [f32; 16],
    delta: [f32; 4],
    custom: [f32; 4],
    acceleration: [f32; 4],
}
impl GPUMesh {
    pub fn new() -> Self {
        let m = GPUMesh {
            transformation: [
                1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
            ],
            delta: [0.0, 0.0, 0.0, 0.0],
            custom: [0.0, 0.0, 0.0, 0.0],
            acceleration: [0.0, 0.0, 0.0, 0.0],
        };

        return m;
    }
}
