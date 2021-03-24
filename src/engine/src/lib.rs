extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

mod engine;
mod boundingBox;
pub use crate::engine::Engine;
pub use crate::boundingBox::BoundingBox;

const GPU_ALIGNMENT: u32 = 256;

pub struct Vec4<T> {
    x: T,
    y: T,
    z: T,
    w: T,
}
pub struct Vec3 {
    x: f32,
    y: f32,
    z: f32,
}

#[wasm_bindgen]
pub struct Mesh {
    engine: *mut Engine,
    gpu_alignment: u32,
    gpu_mesh: GPUMesh,
    rotation: Vec4<f32>,
    scaling: Vec3,
    bounding_box:BoundingBox
}
#[wasm_bindgen]
impl Mesh {
    fn update(&mut self, callback : Box<dyn FnOnce(&Vec3, &Vec4<f32>)>) {
        callback(&self.scaling, &self.rotation);
        self.on_update();
    }
    fn on_update(&mut self) {
        self.update_matrix();
        unsafe {
            let engine = &mut *self.engine;
            engine.gpu_queue.push((&self.gpu_mesh, 1));
        }
        if self.bounding_box.has_bounding {

        }
    }
    pub fn update_scale_and_rotation(&mut self, x: f32, y: f32, z: f32, rx: f32, ry: f32, rz: f32, rw: f32) {
        self.scaling.x = x;
        self.scaling.y = y;
        self.scaling.z = z;
        self.rotation.x = rx;
        self.rotation.y = ry;
        self.rotation.z = rz;
        self.rotation.w = rw;
        self.on_update();
    }
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
    #[wasm_bindgen(setter)]
    pub fn set_scale_x(&mut self, x:f32) {
        self.scaling.x=x;
        self.on_update();
    }
    #[wasm_bindgen(getter)]
    pub fn scale_x(&mut self) -> f32 {
        self.scaling.x
    }
    #[wasm_bindgen(setter)]
    pub fn set_scale_y(&mut self, y:f32) {
        self.scaling.y=y;
        self.on_update();
    }
    #[wasm_bindgen(getter)]
    pub fn scale_y(&mut self) -> f32 {
        self.scaling.y
    }
    #[wasm_bindgen(setter)]
    pub fn set_scale_z(&mut self, z:f32) {
        self.scaling.z=z;
        self.on_update();
    }
    #[wasm_bindgen(getter)]
    pub fn scale_z(&mut self) -> f32 {
        self.scaling.z
    }
    pub fn update_rotation(&mut self, x: f32, y: f32, z: f32, w: f32) {
        self.rotation.x = x;
        self.rotation.y = y;
        self.rotation.z = z;
        self.rotation.w = w;
        self.on_update();
    }
    #[wasm_bindgen(getter)]
    pub fn gpu_pointer(&self) -> *const Vec4<Vec4<f32>> {
        &self.gpu_mesh.transformation
    }
    #[wasm_bindgen(getter)]
    pub fn gpu_alignment(&self) -> u32 {
        self.gpu_alignment
    }
    #[wasm_bindgen(constructor)]
    pub fn new(engine: &mut Engine,has_bounding:bool) -> Self {
        let m = Mesh {
            engine: engine,
            gpu_alignment: engine.allocate_gpu(),
            gpu_mesh: GPUMesh::new(),
            bounding_box: BoundingBox {
                has_bounding,
                min:Vec3 {x:0.0,y:0.0,z:0.0},
                max:Vec3 {x:0.0,y:0.0,z:0.0},
                min_original:Vec3 {x:0.0,y:0.0,z:0.0},
                max_original:Vec3 {x:0.0,y:0.0,z:0.0},
                dirty_min:true,
                dirty_max:true,
                need_init_min:true,
                need_init_max:true,
            },
            rotation: Vec4 {
                x: 0.0,
                y: 0.0,
                z: 0.0,
                w: 0.0,
            },
            scaling: Vec3 {
                x: 1.0,
                y: 1.0,
                z: 1.0,
            },
        };
        //MESHES.push(&m);
        return m;
    }
    pub fn destroy(self) {
        unsafe {
            (*self.engine).de_allocate_gpu(self.gpu_alignment);
        }
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

        self.gpu_mesh.transformation.x.x = (1.0 - (yy + zz)) * sx;
        self.gpu_mesh.transformation.x.y = (xy + wz) * sx;
        self.gpu_mesh.transformation.x.z = (xz - wy) * sx;

        self.gpu_mesh.transformation.y.x = (xy - wz) * sy;
        self.gpu_mesh.transformation.y.y = (1.0 - (xx + zz)) * sy;
        self.gpu_mesh.transformation.y.z = (yz + wx) * sy;

        self.gpu_mesh.transformation.z.x = (xz + wy) * sz;
        self.gpu_mesh.transformation.z.y = (yz - wx) * sz;
        self.gpu_mesh.transformation.z.z = (1.0 - (xx + yy)) * sz;
    }
}

#[repr(align(8))]
pub struct GPUMesh {
    transformation: Vec4<Vec4<f32>>,
    delta: [f32; 4],
    custom: [f32; 4],
    acceleration: [f32; 4],
}
impl GPUMesh {
    pub fn new() -> Self {
        let m = GPUMesh {
            transformation: Vec4 {
                x: Vec4 { x:1.0, y:0.0, z:0.0, w:0.0},
                y: Vec4 { x:0.0, y:1.0, z:0.0, w:0.0},
                z: Vec4 { x:0.0, y:0.0, z:1.0, w:0.0},
                w: Vec4 { x:0.0, y:0.0, z:0.0, w:1.0},
            },
            delta: [0.0, 0.0, 0.0, 0.0],
            custom: [0.0, 0.0, 0.0, 0.0],
            acceleration: [0.0, 0.0, 0.0, 0.0],
        };

        return m;
    }
}
