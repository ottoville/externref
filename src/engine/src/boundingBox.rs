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

    pub fn init_min(mesh:&mut Mesh) {
        if mesh.geometry.vertices.len() < 3 {
            return;
        }
        mesh.geometry.bounding_box.min_original.x= mesh.geometry.vertices[0];
        mesh.geometry.bounding_box.min_original.y= mesh.geometry.vertices[1];
        mesh.geometry.bounding_box.min_original.z= mesh.geometry.vertices[2];

        let positions=mesh.geometry.vertices.chunks(mesh.geometry.vertices_stride);
        for position in positions {
            if position[0] < mesh.geometry.bounding_box.min_original.x {
                mesh.geometry.bounding_box.min_original.x = position[0]
            }
            if position[1] < mesh.geometry.bounding_box.min_original.y {
                mesh.geometry.bounding_box.min_original.y = position[1]
            }
            if position[2] < mesh.geometry.bounding_box.min_original.z {
                mesh.geometry.bounding_box.min_original.z = position[2]
            }
        }
        mesh.geometry.bounding_box.need_init_min = false;
        BoundingBox::update_min(mesh);
    }
    fn update_min(mesh:&mut Mesh) {
        mesh.geometry.bounding_box.min_original.transform_to_ref(&mesh.gpu_mesh.transformation, &mut mesh.geometry.bounding_box.min);
        mesh.geometry.bounding_box.dirty_min = false;
    }
    pub fn init_max(mesh:&mut Mesh) {
        if mesh.geometry.vertices.len() < 3 {
            return;
        }
        mesh.geometry.bounding_box.max_original.x= mesh.geometry.vertices[0];
        mesh.geometry.bounding_box.max_original.y= mesh.geometry.vertices[1];
        mesh.geometry.bounding_box.max_original.z= mesh.geometry.vertices[2];

        let positions=mesh.geometry.vertices.chunks(mesh.geometry.vertices_stride);
        for position in positions {
            if position[0] > mesh.geometry.bounding_box.max_original.x {
                mesh.geometry.bounding_box.max_original.x = position[0]
            }
            if position[1] > mesh.geometry.bounding_box.max_original.y {
                mesh.geometry.bounding_box.max_original.y = position[1]
            }
            if position[2] > mesh.geometry.bounding_box.max_original.z {
                mesh.geometry.bounding_box.max_original.z = position[2]
            }
        }
        mesh.geometry.bounding_box.need_init_max=false;
        Self::update_max(mesh);
    }
    fn update_max(mesh:&mut Mesh) {
        mesh.geometry.bounding_box.max_original.transform_to_ref(&mut mesh.gpu_mesh.transformation, &mut mesh.geometry.bounding_box.max);
        mesh.geometry.bounding_box.dirty_max = false;
    }
}