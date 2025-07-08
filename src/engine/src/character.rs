use core::f32;

use crate::{
    allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex,
    engine::Engine2,
    mesh::{JSMesh, Mesh, ENGINE},
    meshes::r#box::create_box_geometry,
};
use externref::{externref, Resource};
use rapier3d::{
    na::{Isometry3, Vector3},
    prelude::{Ball, QueryFilter, Shape},
};
use terramath::VectorMath;

#[externref]
#[no_mangle]
pub unsafe extern "C" fn set_mesh_externref(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    externref: Resource<JSMesh>,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];

    mesh.externref = Some(externref);
}
#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub unsafe extern "C" fn move_character(
    character_mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    dt: f32,
    x: f32,
    y: f32,
    z: f32,
) -> bool {
    ENGINE
        .engine2
        .lock()
        .unwrap()
        .move_character(&*character_mesh_id, dt / 1000.0, x, y, z)
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn new_character_mesh(
    scenes: f32,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> *const ExplicitGenerationalFreeListIndex<Mesh> {
    let geometry = create_box_geometry();
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    let mesh_id = Mesh::new(
        0.0,
        0.0,
        scenes,
        0,
        label,
        None,
        None,
        ENGINE.meshes.lock().unwrap(),
        false
    );
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&mesh_id];
    mesh.character = Some(Character {
        impulse: [0.0; 3],
        shape: Box::new(Ball::new(3.0)),
    });
    mesh.geometry = Some(Box::new(geometry));
    {
        let mut mesh_property = mesh.mesh_property.lock().unwrap();
        mesh_property.update_color(0.0, 0.9, 1.0, 0.0);
        mesh_property.update_euler_angles(f32::consts::PI, 0.0, 0.0);
    }
    return Box::into_raw(Box::new(mesh_id));
}

#[no_mangle]
pub unsafe extern "C" fn get_impulse_from_id(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> *const f32 {
    ENGINE.meshes.lock().unwrap()[&*mesh_id]
        .character
        .as_mut()
        .unwrap()
        .impulse
        .as_ptr()
}
pub struct Character {
    pub impulse: [f32; 3],
    pub shape: Box<dyn Shape>,
}
impl Engine2 {
    pub fn move_character(
        &mut self,
        character_mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
        dt: f32,
        x: f32,
        y: f32,
        z: f32,
    ) -> bool {
        /*
         * BUGS:
         * modified eg moved or rotated collider does not get updated?
         */
        let mesh = &mut ENGINE.meshes.lock().unwrap()[unsafe { &*character_mesh_id }];

        let cur_pos = mesh.mesh_property.lock().unwrap().translation.0;

        let character_pos = Isometry3::new(
            Vector3::from(cur_pos),
            Vector3::y() * std::f32::consts::FRAC_PI_2,
        );
        let desired_translation = Vector3::from([x, y, z]);
        let filter = QueryFilter::default();
        self.query_pipeline.update_incremental(
            &self.collider_set,
            &self.modified_colliders,
            &self.removed_colliders,
            true,
        );
        self.modified_colliders.clear();
        self.removed_colliders.clear();
        let corrected_movement = ENGINE.character_controller.move_shape(
            dt,
            &self.rigid_body_set,
            &self.collider_set,
            &self.query_pipeline,
            &(*mesh.character.as_ref().unwrap().shape),
            &character_pos,
            desired_translation,
            filter,
            |_collision| {},
        );
        mesh.update_translation_vec(
            cur_pos.add_vec(&corrected_movement.translation.data.0[0]),
            true,
        );
        return corrected_movement.grounded;
    }
}
