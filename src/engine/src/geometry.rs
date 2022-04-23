
pub use crate::Vec3;
pub use crate::Vec4;
pub use crate::boundingbox::BoundingBox;
use crate::engine::Engine2;
use crate::engine::create_js_string;
use crate::engine::jslog;
use rapier3d::prelude::*;

pub struct ColliderPlane {
    plane: Plane,
    vectors: [f32;3]
}
pub struct Geometry {
    pub bounding_box:BoundingBox,
    pub vertices:Vec<f32>,
    pub vertices_stride: usize,
    pub indices:Vec<usize>,
    pub faces:Faces,
    pub strip:bool,

    pub collider_planes: Vec<ColliderPlane>,
    pub collider_planes_parallel: Vec<[f32;4]>, //lanes for x,y,z,d
    pub last_collider_world_vertices:Vec<f32>,

    pub static_faces: bool, // Used for terrain
    pub rigid_body_handle:RigidBodyHandle
}
impl Geometry {
    pub unsafe fn new(has_bounding:bool,vertices_stride:usize, static_faces:bool, strip:bool, collider:Collider, engine2: &mut Engine2) -> (Self, RigidBodyHandle) {       
        let rigid_body = RigidBodyBuilder::dynamic().additional_mass(0.5).additional_mass_properties(MassProperties::new(
            point![0.0, 1.0, 0.0],
            0.5,
            vector![0.3, 0.2, 0.1],
        ))
        .translation(vector![0.0, 10.0, 0.0])
        .build();
        let rigid_body_handle:RigidBodyHandle;

        rigid_body_handle = engine2.rigid_body_set.insert(rigid_body);
        engine2.collider_set.insert_with_parent(collider, rigid_body_handle, &mut engine2.rigid_body_set);
    
        let mut g = Geometry {
            bounding_box:BoundingBox::new(has_bounding),
            vertices: Vec::new(),
            indices:Vec::new(),
            vertices_stride,
            faces:Faces::new(0),
            collider_planes:Vec::new(),
            collider_planes_parallel:Vec::new(),
            last_collider_world_vertices:Vec::new(),
            static_faces,
            strip,
            rigid_body_handle
        };
        g.allocate_faces();
        return (g, rigid_body_handle);
    }
    pub fn faces_count(&self) -> usize {
        if self.static_faces {
            return self.faces.planes.len();
        } else {
            //TODO: Hand strip and indexed
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
}