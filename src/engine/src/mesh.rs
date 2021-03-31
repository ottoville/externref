
use wasm_bindgen::prelude::*;

pub use crate::engine::Engine;
pub use crate::Vec3;
pub use crate::Vec4;
pub use crate::GPUMesh;
pub use crate::geometry::Geometry;

#[wasm_bindgen]
pub struct Mesh {
    engine: *mut Engine,
    gpu_alignment: u32,
    #[wasm_bindgen(skip)]
    pub gpu_mesh: GPUMesh,
    rotation: Vec4<f32>,
    scaling: Vec3<f32>,
    #[wasm_bindgen(skip)]
    pub geometry:Geometry
}

#[wasm_bindgen]
impl Mesh {
    #[wasm_bindgen(method, getter)]
    pub fn bounding_min(&mut self) -> Vec<f32> {
        if self.geometry.bounding_box.need_init_min {
            let mut bb = self.geometry.bounding_box;
            bb.init_min(self);
        }
        else if self.geometry.bounding_box.dirty_min {
            self.geometry.bounding_box.min_original.transform_to_ref(&mut self.gpu_mesh.transformation,&mut self.geometry.bounding_box.min);
            self.geometry.bounding_box.dirty_min = false;
        }
        return vec![self.geometry.bounding_box.min.x, self.geometry.bounding_box.min.y, self.geometry.bounding_box.min.z];
    }
    #[wasm_bindgen(method, getter)]
    pub fn bounding_max(&mut self) -> Vec<f32> {
        if self.geometry.bounding_box.need_init_max {
            let mut bb = self.geometry.bounding_box;
            bb.init_max(self);
        }
        else if self.geometry.bounding_box.dirty_max {
            self.geometry.bounding_box.max_original.transform_to_ref(&mut self.gpu_mesh.transformation,&mut self.geometry.bounding_box.max);
            self.geometry.bounding_box.dirty_max = false;
        }
        return vec![self.geometry.bounding_box.max.x, self.geometry.bounding_box.max.y, self.geometry.bounding_box.max.z];
    }
    //#[wasm_bindgen(method, setter)]
    pub fn set_bounding_need_init_min(&mut self) {
        self.geometry.bounding_box.need_init_min = true;
    }
    //#[wasm_bindgen(method, setter)]
    pub fn set_bounding_need_init_max(&mut self) {
        self.geometry.bounding_box.need_init_max = true;
    }
    pub fn set_bounding_need_dirty_min(&mut self) {
        self.geometry.bounding_box.dirty_min = true;
    }
    pub fn set_bounding_need_dirty_max(&mut self) {
        self.geometry.bounding_box.dirty_max = true;
    }
    fn update(&mut self, callback : Box<dyn FnOnce(&Vec3<f32>, &Vec4<f32>)>) {
        callback(&self.scaling, &self.rotation);
        self.on_update();
    }
    fn on_update(&mut self) {
        self.update_matrix();
        unsafe {
            let engine = &mut *self.engine;
            engine.gpu_queue.push((&self.gpu_mesh, 1));
        }
        if self.geometry.bounding_box.has_bounding {
            self.geometry.bounding_box.dirty_max=true;
            self.geometry.bounding_box.dirty_min=true;
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
    #[wasm_bindgen(setter)]
    pub fn set_gpu_custom_data(&mut self, data:Vec<f32>) {
        self.gpu_mesh.custom[0]=data[0];
        self.gpu_mesh.custom[1]=data[1];
        self.gpu_mesh.custom[2]=data[2];
        self.gpu_mesh.custom[3]=data[3];
    }
    #[wasm_bindgen(getter)]
    pub fn gpu_alignment(&self) -> u32 {
        self.gpu_alignment
    }
    pub fn vertices_pointer(&self) -> *const f32 {
        self.geometry.vertices.as_ptr()
    }
    pub fn update_vertices(&mut self, vertices:Vec<f32>) {
        self.geometry.update_vertices(vertices);
    }
    #[wasm_bindgen(constructor)]
    pub fn new(engine: &mut Engine,has_bounding:bool, has_geometry:bool, vertices_amount:usize , vertices_stride:usize) -> Self {
        let m = Mesh {
            engine: engine,
            gpu_alignment: engine.allocate_gpu(),
            gpu_mesh: GPUMesh::new(),
            geometry: Geometry::new(has_geometry, has_bounding, vertices_stride, vertices_amount),
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
