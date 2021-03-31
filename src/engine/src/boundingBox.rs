use wasm_bindgen::prelude::*;

pub use crate::Vec3;
pub use crate::Vec4;
pub use crate::mesh::Mesh;

#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct BoundingBox {
    pub has_bounding:bool,
    #[wasm_bindgen(skip)]
    pub min:Vec3<f32>,
    #[wasm_bindgen(skip)]
    pub max:Vec3<f32>,
    #[wasm_bindgen(skip)]
    pub min_original:Vec3<f32>,
    #[wasm_bindgen(skip)]
    pub max_original:Vec3<f32>,
    pub dirty_min:bool,
    pub dirty_max:bool,
    pub need_init_min:bool,
    pub need_init_max:bool,

}

impl BoundingBox {
    pub fn new(has_bounding:bool) -> Self {
        BoundingBox {
            has_bounding,
            min:Vec3 {x:0.0,y:0.0,z:0.0},
            max:Vec3 {x:0.0,y:0.0,z:0.0},
            min_original:Vec3 {x:0.0,y:0.0,z:0.0},
            max_original:Vec3 {x:0.0,y:0.0,z:0.0},
            dirty_min:true,
            dirty_max:true,
            need_init_min:true,
            need_init_max:true
        }
    }

    pub fn init_min(&mut self, mesh:&mut Mesh) {
        if mesh.geometry.vertices.len() < 3 {
            return;
        }
        self.min_original.x= mesh.geometry.vertices[0];
        self.min_original.y= mesh.geometry.vertices[1];
        self.min_original.z= mesh.geometry.vertices[2];

        let positions=mesh.geometry.vertices.chunks(mesh.geometry.vertices_stride);
        for position in positions {
            if position[0] < self.min_original.x {
                self.min_original.x = position[0]
            }
            if position[1] < self.min_original.y {
                self.min_original.y = position[1]
            }
            if position[2] < self.min_original.z {
                self.min_original.z = position[2]
            }
        }
        self.need_init_min=false;
        self.update_min(mesh);
    }
    fn update_min(&mut self, mesh:&mut Mesh) {
        self.min_original.transform_to_ref(&mut mesh.gpu_mesh.transformation, &mut self.min);
        self.dirty_min = false;
    }
    pub fn init_max(&mut self, mesh:&mut Mesh) {
        if mesh.geometry.vertices.len() < 3 {
            return;
        }
        self.max_original.x= mesh.geometry.vertices[0];
        self.max_original.y= mesh.geometry.vertices[1];
        self.max_original.z= mesh.geometry.vertices[2];

        let positions=mesh.geometry.vertices.chunks(mesh.geometry.vertices_stride);
        for position in positions {
            if position[0] > self.max_original.x {
                self.max_original.x = position[0]
            }
            if position[1] > self.max_original.y {
                self.max_original.y = position[1]
            }
            if position[2] > self.max_original.z {
                self.max_original.z = position[2]
            }
        }
        self.need_init_max=false;
        self.update_max(mesh);
    }
    fn update_max(&mut self, mesh:&mut Mesh) {
        self.max_original.transform_to_ref(&mut mesh.gpu_mesh.transformation, &mut self.max);
        self.dirty_max = false;
    }
    /*pub fn get_min(&mut self, mesh:&mut Mesh) -> &Vec3<f32> {
        if self.need_init_min {
            self.init_min(mesh);
        }
        else if self.dirty_min {
            self.min_original.transform(&mut mesh.gpu_mesh.transformation);
            self.dirty_min = false;
        }
        return &self.min;
    }
    pub fn get_max(&mut self, mesh:&mut Mesh) -> &Vec3<f32> {
        if self.need_init_max {
            self.init_max(mesh);
        }
        else if self.dirty_max {
            self.max_original.transform(&mut mesh.gpu_mesh.transformation);
            self.dirty_max = false;
        }
        return &self.max;
    }*/
    pub fn get_min_wasm(&mut self, mesh:&mut Mesh) -> Vec<f32> {
        if self.need_init_min {
            self.init_min(mesh);
        }
        else if self.dirty_min {
            self.min_original.transform_to_ref(&mut mesh.gpu_mesh.transformation, &mut self.min);
            self.dirty_min = false;
        }
        return vec![self.min.x, self.min.y, self.min.z];
    }
    pub fn get_max_wasm(&mut self, mesh:&mut Mesh) -> Vec<f32> {
        if self.need_init_max {
            self.init_max(mesh);
        }
        else if self.dirty_max {
            self.max_original.transform_to_ref(&mut mesh.gpu_mesh.transformation, &mut self.max);
            self.dirty_max = false;
        }
        return vec![self.max.x, self.max.y, self.max.z];
    }
}