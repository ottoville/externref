use std::{
    collections::HashMap,
    sync::{Mutex, MutexGuard},
};

use terramath::{MatrixMath, Quaternion};

use crate::{
    allocators::freeindex::FreeIndexIndex, devtools::DEVTOOLS, engine::js_warn, math2::Vec3wgslF32,
    mesh::get_mesh_by_id_mut, GPUMesh,
};

static CB_ID: Mutex<usize> = Mutex::new(0);

#[no_mangle]
pub unsafe extern "C" fn remove_onchange_callback(mesh_id: usize, cb: usize) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    let mut mesh_property = mesh.mesh_property.lock().unwrap();
    mesh_property.on_change.remove(&cb);
}
#[no_mangle]
pub unsafe extern "C" fn add_onchange_callback(mesh_id: usize) -> usize {
    let mesh = get_mesh_by_id_mut(mesh_id);
    let mut mesh_property = mesh.mesh_property.lock().unwrap();
    let mut mid = CB_ID.lock().unwrap();
    let id = mid.clone();
    mesh_property.on_change.insert(
        id,
        Box::new(|mesh_property| {
            let mut devtools = DEVTOOLS.write().unwrap();
            mesh_property
                .rotation
                .to_euler_angles(&mut devtools.euler_angles);
            devtools.translation = mesh_property.translation.0.clone();
            devtools.scale = mesh_property.scaling.clone();
        }),
    );
    *mid += 1;
    return id;
}

pub struct MeshProperty {
    pub gpu_mesh_alignment: FreeIndexIndex,
    pub gpu_memory: GPUMesh,
    pub transformation: [[f32; 4]; 4],
    pub transformation_is_dirty: bool,
    pub translation: Vec3wgslF32,
    pub rotation: Quaternion,
    pub scaling: [f32; 3],
    pub color: [f32; 4],
    pub on_change: HashMap<usize, Box<dyn Fn(&MutexGuard<MeshProperty>) -> ()>>,
}
impl MeshProperty {
    pub fn update_matrix(&mut self) {
        let x: f32 = self.rotation.i;
        let y: f32 = self.rotation.j;
        let z: f32 = self.rotation.k;
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

        let mut uniform_scaling = true;
        if self.scaling[0] != self.scaling[1] || self.scaling[0] != self.scaling[2] {
            uniform_scaling = false;
        }

        self.transformation[0][0] = (1.0 - (yy + zz)) * self.scaling[0];
        self.transformation[0][1] = (xy + wz) * self.scaling[0];
        self.transformation[0][2] = (xz - wy) * self.scaling[0];

        self.transformation[1][0] = (xy - wz) * self.scaling[1];
        self.transformation[1][1] = (1.0 - (xx + zz)) * self.scaling[1];
        self.transformation[1][2] = (yz + wx) * self.scaling[1];

        self.transformation[2][0] = (xz + wy) * self.scaling[2];
        self.transformation[2][1] = (yz - wx) * self.scaling[2];
        self.transformation[2][2] = (1.0 - (xx + yy)) * self.scaling[2];

        self.transformation[3][0] = self.translation.0[0];
        self.transformation[3][1] = self.translation.0[1];
        self.transformation[3][2] = self.translation.0[2];

        let gpu_mesh = &mut self.gpu_memory;
        gpu_mesh.color[0] = self.color[0];
        gpu_mesh.color[1] = self.color[1];
        gpu_mesh.color[2] = self.color[2];
        gpu_mesh.color[3] = self.color[3];
        gpu_mesh.transformation = self.transformation;

        let mut sub_3x3 = [
            [
                self.transformation[0][0],
                self.transformation[0][1],
                self.transformation[0][2],
            ],
            [
                self.transformation[1][0],
                self.transformation[1][1],
                self.transformation[1][2],
            ],
            [
                self.transformation[2][0],
                self.transformation[2][1],
                self.transformation[2][2],
            ],
        ];
        // If not equally to scale into all dimensions, re-calculate normals matrix
        if !uniform_scaling {
            sub_3x3.transpose();
            if !sub_3x3.invert() {
                js_warn([&"Cannot invert normal matrix for a mesh"]);
            }
        }
        gpu_mesh.transformation_normals.x = sub_3x3[0];
        gpu_mesh.transformation_normals.y = sub_3x3[1];
        gpu_mesh.transformation_normals.z = sub_3x3[2];

        self.transformation_is_dirty = false;
    }
    pub fn get_transformation(&mut self) -> &[[f32; 4]; 4] {
        if self.transformation_is_dirty {
            self.update_matrix();
        }
        return &self.transformation;
    }
}
