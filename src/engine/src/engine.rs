use std::collections::HashMap;
use std::num::NonZeroUsize;
use std::sync::{LazyLock, Mutex, MutexGuard};
use std::{panic, usize};

use crate::allocators::freeindex::FreeIndex;

use crate::gpu::gpu::GPU;

use crate::mesh::JSMesh;
pub use crate::mesh::Mesh;
pub use crate::GPUMesh;
use externref::externref;
use externref::Resource;
use logger::Logger;
use rapier3d::control::KinematicCharacterController;
use rapier3d::{crossbeam, prelude::*};

extern "C" {
    #[cfg(target_arch = "wasm32")]
    pub fn verticesChange(mesh_id: usize);

}
#[cfg(test)]
unsafe fn mesh_on_physic_tick(_mesh: *const Mesh, _delta: f32, _externref: &Resource<JSMesh>) {}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "env")]
extern "C" {
    fn mesh_on_physic_tick(mesh: *const Mesh, delta: f32, externref: &Resource<JSMesh>);
}

#[no_mangle]
#[externref]
pub unsafe extern "C" fn get_engine() -> *mut MutexGuard<'static, Engine2> {
    Box::into_raw(Box::new(ENGINE.engine2.lock().unwrap()))
}

#[no_mangle]
pub unsafe extern "C" fn drop_engine_lock(engine: *mut MutexGuard<'static, Engine2>) {
    drop(Box::from_raw(engine));
}
#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub extern "C" fn init_engine2() -> usize {

    String::from("Init engine").log();
    panic::set_hook(Box::new(|panic_info| {
        panic_info.to_string().error();
    }));
    debug_assert!(std::mem::size_of::<GPUMesh>() % 8 == 0, "GPUMesh offset must be multiple of 8 https://www.w3.org/TR/webgpu/#dom-gpubuffer-getmappedrange");
    std::mem::size_of::<GPUMesh>()
}

#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub unsafe extern "C" fn physic_tick(delta: f32) {
    for mesh in ENGINE.meshes.lock().unwrap().iter() {
        if let Some(externref) = mesh.externref.as_ref() {
            unsafe { mesh_on_physic_tick(mesh, delta, externref) }
        }
    }
    let engine = &mut ENGINE.engine2.lock().unwrap();
    engine.physic_tick(delta/1000.0);
}


const GRAVITY: nalgebra::Matrix<
    f32,
    nalgebra::Const<3>,
    nalgebra::Const<1>,
    nalgebra::ArrayStorage<f32, 3, 1>,
> = vector![0.0, -9.81, 0.0];

pub struct Engine {
    pub engine2: Mutex<Engine2>,
    pub gpu: Mutex<Option<GPU>>,
    event_handler: ChannelEventCollector,
    pub character_controller: KinematicCharacterController,
    pub meshes: Mutex<Vec<Mesh>>,
}
pub struct Engine2 {
    pub physic_pipeline: PhysicsPipeline,
    pub rigid_bodies: HashMap<RigidBodyHandle, usize>,
    pub gpu_allocated: FreeIndex,
    pub collider_set: ColliderSet,
    pub modified_colliders: Vec<ColliderHandle>,
    pub removed_colliders: Vec<ColliderHandle>,
    pub broad_phase: DefaultBroadPhase,
    pub ccd_solver: CCDSolver,
    pub island_manager: IslandManager,
    pub joint_set: ImpulseJointSet,
    pub narrow_phase: NarrowPhase,
    pub multi_joint_set: MultibodyJointSet,
    pub rigid_body_set: RigidBodySet,
    pub query_pipeline: QueryPipeline,
}

pub static ENGINE: LazyLock<Engine> = LazyLock::new(|| {
    // Initialize the event collector.
    let (contact_send, _contact_recv) = crossbeam::channel::unbounded();
    let (collision_send, _collision_recv) = crossbeam::channel::unbounded();

    return Engine {
        engine2: Mutex::new(Engine2 {
            physic_pipeline: PhysicsPipeline::new(),
            rigid_bodies: HashMap::new(),
            gpu_allocated: FreeIndex::new(),
            collider_set: ColliderSet::new(),
            modified_colliders: Vec::with_capacity(32),
            removed_colliders: Vec::with_capacity(32),
            broad_phase: DefaultBroadPhase::new(),
            ccd_solver: CCDSolver::new(),
            island_manager: IslandManager::new(),
            joint_set: ImpulseJointSet::new(),
            narrow_phase: NarrowPhase::new(),
            multi_joint_set: MultibodyJointSet::new(),
            rigid_body_set: RigidBodySet::new(),
            query_pipeline: QueryPipeline::new(),
        }),
        gpu: Mutex::new(None),
        meshes: Mutex::new(Vec::with_capacity(100)),

        event_handler: ChannelEventCollector::new(collision_send, contact_send),

        character_controller: KinematicCharacterController::default(),
    };
});

// MESH ON COLLIDE JAVASCRIPT EVENT REMOVED
// TODO: create rust event for that
/*unsafe fn collider_to_mesh<'frame>(
    e: &'frame Engine2,
    collider_handle: ColliderHandle,
) -> Option<&'frame Mesh> {
    /*let collider = e.collider_set.get(collider_handle)?;
    let rigid_body_handle = collider.parent()?;
    let mesh_id = e.rigid_bodies.get(&rigid_body_handle)?;
    return Some(get_mesh_by_id(*mesh_id));*/
    let collider_set = &mut ENGINE.engine2.lock().unwrap().collider_set;

    return match collider_set.get(collider_handle) {
        Some(collider) => match collider.parent() {
            Some(rigid_body_handle) => {
                let mesh_id = e.rigid_bodies.get(&rigid_body_handle);
                match mesh_id {
                    Some(id) => return Some(&e.meshes[*id]),
                    None => {
                        js_warn(["mesh_id not found"]);
                        None
                    }
                }
            }
            None => {
                js_warn(["rigid_body_handle not found"]);
                None
            }
        },
        None => {
            js_warn(["parent collider not found"]);
            None
        }
    };
}*/

impl Engine2 {
    pub fn physic_tick(&mut self, dt: f32) {
        let integration_parameters: IntegrationParameters = IntegrationParameters {
            dt,
            min_ccd_dt: 1.0 / 60.0 / 100.0,
            contact_natural_frequency: 30.0,
            contact_damping_ratio: 5.0,
            joint_natural_frequency: 1.0e6,
            joint_damping_ratio: 1.0,
            warmstart_coefficient: 1.0,
            num_internal_pgs_iterations: 1,
            num_internal_stabilization_iterations: 2,
            num_additional_friction_iterations: 0,
            num_solver_iterations: unsafe { NonZeroUsize::new_unchecked(4) },
            // TODO: what is the optimal value for min_island_size?
            // It should not be too big so that we don't end up with
            // huge islands that don't fit in cache.
            // However we don't want it to be too small and end up with
            // tons of islands, reducing SIMD parallelism opportunities.
            min_island_size: 128,
            normalized_allowed_linear_error: 0.001,
            normalized_max_corrective_velocity: 10.0,
            normalized_prediction_distance: 0.002,
            max_ccd_substeps: 2,
            length_unit: 1.0,
        };
        let physics_hooks = ();
        self.physic_pipeline.step(
            &GRAVITY,
            &integration_parameters,
            &mut self.island_manager,
            &mut self.broad_phase,
            &mut self.narrow_phase,
            &mut self.rigid_body_set,
            &mut self.collider_set,
            &mut self.joint_set,
            &mut self.multi_joint_set,
            &mut self.ccd_solver,
            None,
            &physics_hooks,
            &ENGINE.event_handler,
        );
        // MESH ON COLLIDE JAVASCRIPT EVENT REMOVED
        // TODO: create rust event for that
        /*
        unsafe {
            while let Ok(collision_event) = collision_recv.try_recv() {
                // Handle the collision event.
                match collider_to_mesh(self, collision_event.collider1()) {
                    Some(m) => mesh_on_collide(self, m.id, collision_event.started()),
                    None => js_warn(["Mesh not found for collider1"]),
                }
                match collider_to_mesh(&self, collision_event.collider2()) {
                    Some(m) => mesh_on_collide(self, m.id, collision_event.started()),
                    None => js_warn(["Mesh not found for collider2"]),
                }
            }
        };*/
        // Iter on each dynamic rigid-bodies that moved.
        for rigid_body_handle in self.island_manager.active_dynamic_bodies() {
            let mesh = self.rigid_bodies.get_mut(rigid_body_handle);
            match mesh {
                Some(m_id) => {
                    let rigid_body = &self.rigid_body_set[*rigid_body_handle];
                    let newrot = rigid_body.rotation().as_vector();
                    let mesh_id = *m_id;
                    let mesh = &mut ENGINE.meshes.lock().unwrap()[mesh_id];

                    {
                        let mut mesh_property = mesh.mesh_property.lock().unwrap();

                        mesh_property.rotation.i = newrot.x;
                        mesh_property.rotation.j = newrot.y;
                        mesh_property.rotation.k = newrot.z;
                        mesh_property.rotation.w = newrot.w;
                    }
                    let pos = rigid_body.position();
                    mesh.update_translation(
                        pos.translation.x,
                        pos.translation.y,
                        pos.translation.z,
                        false,
                    );
                }
                None => "Mesh not found for rigid body".warn(),
            }
        }
    }
    pub fn add_collider_to_mesh<'a>(&mut self, collider: Collider, mesh_id: usize) {
        let mesh = &mut ENGINE.meshes.lock().unwrap()[mesh_id];
        match mesh.rigid_body_handle {
            Some(rigid_body_handle) => {
                let collider_handle = self.collider_set.insert_with_parent(
                    collider,
                    rigid_body_handle,
                    &mut self.rigid_body_set,
                );
                self.modified_colliders.push(collider_handle);
                if let Some(old) = mesh.collider_handle.replace(collider_handle) {
                    self.collider_set.remove(
                        old,
                        &mut self.island_manager,
                        &mut self.rigid_body_set,
                        true,
                    );
                    self.removed_colliders.push(old);
                }
            }
            None => {
                let collider_handle = self.collider_set.insert(collider);
                mesh.collider_handle.replace(collider_handle);
                self.modified_colliders.push(collider_handle);
            }
        }
    }
}
