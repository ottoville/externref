use wasm_bindgen::prelude::*;

pub use crate::Vec3;
pub use crate::Vec4;
pub use crate::mesh::Mesh;

#[wasm_bindgen]
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
    pub fn transform_min(&mut self, transformation: &Vec4<Vec4<f32>>) {
        self.min_original.transform_to_ref(transformation,&mut self.min);
        self.dirty_min=false;
    }
    pub fn transform_max(&mut self, transformation: &Vec4<Vec4<f32>>) {
        self.max_original.transform_to_ref(transformation,&mut self.max);
        self.dirty_max=false;

    }
}