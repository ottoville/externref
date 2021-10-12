use wasm_bindgen::prelude::*;

pub use crate::Vec3;
pub use crate::Vec4;
pub use crate::boundingbox::BoundingBox;


#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);
}

pub struct ColliderPlane {
    plane: Plane,
    vectors: [f32;3]
}
pub struct Geometry {
    pub has_geometry:bool,
    pub bounding_box:BoundingBox,
    pub vertices:Vec<f32>,
    pub vertices_stride: usize,
    pub indices:Vec<usize>,
    pub faces:Faces,
    pub strip:bool,

    pub collider_planes: Vec<ColliderPlane>,
    pub collider_planes_parallel: Vec<[f32;4]>, //lanes for x,y,z,d
    pub last_collider_world_vertices:Vec<f32>,

    pub static_faces: bool // Used for terrain
}
impl Geometry {
    //TODO: remove positions_count, it does not reflect reality
    pub fn new(has_geometry:bool, has_bounding:bool,vertices_stride:usize, positions_count:usize, static_faces:bool, strip:bool) -> Self {

        let mut g = Geometry {
            has_geometry,
            bounding_box:BoundingBox::new(has_bounding),
            vertices: Vec::new(),
            indices:Vec::new(),
            vertices_stride,
            faces:Faces::new(0),
            collider_planes:Vec::new(),
            collider_planes_parallel:Vec::new(),
            last_collider_world_vertices:Vec::new(),
            static_faces,
            strip
        };
        g.allocate_faces();
        return g;
    }
    pub fn faces_count(&self) -> usize {
        if self.static_faces {
            return self.faces.planes.len();
        } else {
            //TODO: Hand strip and indexed
            if self.has_geometry {
                let position_count = if self.indices.len() > 0 {
                    self.indices.len()
                } else{
                    self.vertices.len() / self.vertices_stride
                };
                if position_count == 0 {
                    return 0usize;
                }
                else if self.strip {
                    position_count -2
                } else {
                    position_count / 3
                }
            } else {0}
        } 
    }
    pub fn allocate_faces(&mut self) {
        self.last_collider_world_vertices=Vec::with_capacity(self.vertices.len()/self.vertices_stride*4);
        if self.static_faces {
            return;
        }
        let faces_count = self.faces_count();
        self.faces=Faces::new(faces_count);
        self.collider_planes=Vec::with_capacity(faces_count);
        self.collider_planes_parallel=Vec::with_capacity(faces_count*4usize);
    }
    pub fn update_bounding_box(&mut self, transformation:&Vec4<Vec4<f32>>) {
        if self.bounding_box.need_init {
            self.bounding_box.init(&self.vertices,self.vertices_stride);
            self.bounding_box.transform(transformation);
        }
        else if self.bounding_box.dirty {
            self.bounding_box.transform(transformation);
        }
    }
    pub fn update_vertices(&mut self, vertices:Vec<f32>) {
        self.vertices=vertices;
        self.bounding_box.need_init = true;
        self.allocate_faces();

    }
    pub fn set_indices(&mut self, indices: Vec<usize>) {
        self.indices = indices;
    }
}
pub struct Faces {
    pub planes:Vec<Plane>
}

pub struct Plane {
    pub norm:[f32;3],
    pub d:f32
}
impl Faces {
    pub fn new(amount:usize) -> Faces {
        Faces {
            planes:Vec::with_capacity(amount)
        }
    }
    pub fn set(&mut self, planes:Vec<f32>) {
        let (ptr, len, cap) = planes.into_raw_parts();
        self.planes = unsafe {
            // We can now make changes to the components, such as
            // transmuting the raw pointer to a compatible type.
            let ptr = ptr as *mut Plane;
            Vec::from_raw_parts(ptr, len / 4, cap / 4)
        };
    }
}