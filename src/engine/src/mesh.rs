
use wasm_bindgen::prelude::*;

pub use crate::engine::Engine;
pub use crate::Vec3;
pub use crate::Vec4;
pub use crate::GPUMesh;
pub use crate::geometry::Geometry;
pub use crate::geometry::Plane;
pub use crate::boundingbox::BoundingBox;
pub use crate::terrain::elevator::Elevator;

#[wasm_bindgen]
pub struct Mesh {
    id:u32,
    gpu_alignment: u32, //Alignment in GPU memory. Real alignment is 256 + gpu_alignment because first block is used for indexing
    #[wasm_bindgen(skip)]
    pub gpu_mesh: GPUMesh,
    rotation: Vec4<f32>,
    scaling: Vec3<f32>,
    #[wasm_bindgen(skip)]
    pub geometry:Geometry,
    pub positions_count:usize,
}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);

}
#[wasm_bindgen]
impl Mesh {
    #[wasm_bindgen(constructor)]
    pub fn new(engine: &mut Engine, id:u32, has_bounding:bool, has_geometry:bool, positions_count:usize , vertices_stride:usize, point_light:f32, directional_light:f32, scenes:u32) -> Self {
        let mut m = Mesh {
            id,
            gpu_alignment: engine.allocate_gpu(),
            gpu_mesh: GPUMesh {
                transformation: Vec4 {
                    x: Vec4 { x:1.0, y:0.0, z:0.0, w:0.0},
                    y: Vec4 { x:0.0, y:1.0, z:0.0, w:0.0},
                    z: Vec4 { x:0.0, y:0.0, z:1.0, w:0.0},
                    w: Vec4 { x:0.0, y:0.0, z:0.0, w:1.0},
                },
                delta: [0.0, 0.0, 0.0, 0.0],
                custom: [0.0, 0.0, 0.0, 0.0],
                acceleration: [0.0, 0.0, 0.0, 0.0],
                id,
                point_light_squared: point_light * point_light,
                directional_light,
                scenes,

            },
            geometry: Geometry::new(has_geometry, has_bounding, vertices_stride, positions_count),
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
            positions_count,
        };
        if point_light > 0.0 {
            engine.lights.insert(m.gpu_alignment);
        }
        m.update_dynamic_buffer(engine);
        return m;
    }
    #[wasm_bindgen(setter)]
    pub fn set_indices(&mut self, indices: Vec<usize>) {
        &self.geometry.set_indices(indices);
    }
    #[wasm_bindgen(getter)]
    pub fn indices_pointer(&self) -> *const usize {
        match &self.geometry.indices {
            None => {
                error("Geometry has no indices");
                panic!("Geometry has no indices")
            },
            Some(indices) => indices.as_ptr(),
        }
    }
    #[wasm_bindgen(getter)]
    pub fn vertices_pointer(&self) -> *const f32 {
        self.geometry.vertices.as_ptr()
    }
    #[wasm_bindgen(getter)]
    pub fn vertices_stride(&self) -> usize {
        self.geometry.vertices_stride
    }
    pub fn update_vertices(&mut self, vertices:Vec<f32>) {
        self.geometry.update_vertices(vertices);
    }

    #[wasm_bindgen(getter)]
    pub fn faces_pointer(&self) -> *const Plane {
        self.geometry.faces.planes.as_ptr()
    }
    #[wasm_bindgen(getter)]
    pub fn faces_count(&self) -> usize {
        self.geometry.faces.planes.len()
    }
    #[wasm_bindgen(setter)]
    pub fn set_faces(&mut self, planes:Vec<f32>) {
        self.geometry.faces.set(planes);
    }
    pub fn create_elevator(&self) -> Elevator {
        Elevator::new(&self)
    }
    #[wasm_bindgen(method, getter)]
    pub fn bounding_min(&mut self) -> Vec<f32> {
        if self.geometry.vertices.len() < 3 {
            return vec![0.0,0.0,0.0];
        }
        if self.geometry.bounding_box.need_init_min {
            self.geometry.bounding_box.min_original = self.geometry.min();
            self.geometry.bounding_box.need_init_min = false;
            self.geometry.bounding_box.transform_min(&self.gpu_mesh.transformation);
        }
        else if self.geometry.bounding_box.dirty_min {
            self.geometry.bounding_box.transform_min(&self.gpu_mesh.transformation);
        }
        return vec![self.geometry.bounding_box.min.x, self.geometry.bounding_box.min.y, self.geometry.bounding_box.min.z];
    }
    #[wasm_bindgen(method, getter)]
    pub fn bounding_max(&mut self) -> Vec<f32> {
        if self.geometry.vertices.len() < 3 {
            return vec![0.0,0.0,0.0];
        }
        if self.geometry.bounding_box.need_init_max {
            self.geometry.bounding_box.max_original = self.geometry.max();
            self.geometry.bounding_box.need_init_max=false;
            self.geometry.bounding_box.transform_max(&self.gpu_mesh.transformation)
        }
        else if self.geometry.bounding_box.dirty_max {
            self.geometry.bounding_box.transform_max(&self.gpu_mesh.transformation)
        }
        return vec![self.geometry.bounding_box.max.x, self.geometry.bounding_box.max.y, self.geometry.bounding_box.max.z];
    }
    pub fn set_bounding_need_init_min(&mut self) {
        self.geometry.bounding_box.need_init_min = true;
    }
    pub fn set_bounding_need_init_max(&mut self) {
        self.geometry.bounding_box.need_init_max = true;
    }
    pub fn set_bounding_need_dirty_min(&mut self) {
        self.geometry.bounding_box.dirty_min = true;
    }
    pub fn set_bounding_need_dirty_max(&mut self) {
        self.geometry.bounding_box.dirty_max = true;
    }
    fn on_update(&mut self, engine:&mut Engine) {
        self.update_matrix();
        self.update_dynamic_buffer(engine);
        if self.geometry.bounding_box.has_bounding {
            self.geometry.bounding_box.dirty_max=true;
            self.geometry.bounding_box.dirty_min=true;
        }
    }
    pub fn update_dynamic_buffer(&mut self, engine:&mut Engine) {
        engine.gpu_queue.insert(&self.gpu_mesh, self.gpu_alignment);
    }
    pub fn update_scale_and_rotation(&mut self, engine:&mut Engine, x: f32, y: f32, z: f32, rx: f32, ry: f32, rz: f32, rw: f32) {
        self.scaling.x = x;
        self.scaling.y = y;
        self.scaling.z = z;
        self.rotation.x = rx;
        self.rotation.y = ry;
        self.rotation.z = rz;
        self.rotation.w = rw;
        self.on_update(engine);
    }
    pub fn update_scale(&mut self,engine:&mut Engine, x: f32, y: f32, z: f32) {
        self.scaling.x = x;
        self.scaling.y = y;
        self.scaling.z = z;
        self.update_matrix();
        engine.gpu_queue.insert(&self.gpu_mesh, self.gpu_alignment);
    }
    pub fn set_scale_x(&mut self,engine:&mut Engine, x:f32) {
        self.scaling.x=x;
        self.on_update(engine);
    }
    #[wasm_bindgen(getter)]
    pub fn scale_x(&mut self) -> f32 {
        self.scaling.x
    }
    pub fn set_scale_y(&mut self,engine:&mut Engine, y:f32) {
        self.scaling.y=y;
        self.on_update(engine);
    }
    #[wasm_bindgen(getter)]
    pub fn scale_y(&mut self) -> f32 {
        self.scaling.y
    }
    pub fn set_scale_z(&mut self, engine:&mut Engine, z:f32) {
        self.scaling.z=z;
        self.on_update(engine);
    }
    #[wasm_bindgen(getter)]
    pub fn scale_z(&mut self) -> f32 {
        self.scaling.z
    }
    pub fn update_rotation(&mut self, engine:&mut Engine, x: f32, y: f32, z: f32, w: f32) {
        self.rotation.x = x;
        self.rotation.y = y;
        self.rotation.z = z;
        self.rotation.w = w;
        self.on_update(engine);
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
    pub fn set_point_light(&mut self, engine:&mut Engine, range:f32) {
        if range > 0.0 {
            self.gpu_mesh.point_light_squared = range * range;
            engine.lights.insert(self.gpu_alignment);
        } else {
            self.gpu_mesh.point_light_squared = 0.0;
            engine.lights.remove(&self.gpu_alignment);
        }
    }
    #[wasm_bindgen(getter)]
    pub fn id(& self) -> u32 {
        self.id
    }
    #[wasm_bindgen(getter)]
    pub fn gpu_alignment(&self) -> u32 {
        self.gpu_alignment
    }

    pub fn destroy(self, engine:&mut Engine) {
        engine.de_allocate_gpu(self.gpu_alignment);
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
