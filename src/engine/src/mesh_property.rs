use std::sync::MutexGuard;

use terramath::{MatrixMath, Quaternion};

use crate::{
    allocators::{
        explicit_freelist::{ExplicitFreeList, ExplicitFreeListIndex},
        freeindex::FreeIndexIndex,
    },
    devtools::DEVTOOLS,
    engine::js_warn,
    math2::Vec3wgslF32,
    mesh::ENGINE,
    GPUMesh,
};

#[no_mangle]
pub unsafe extern "C" fn remove_onchange_callback(mesh_id: usize, cb: ExplicitFreeListIndex) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[mesh_id];
    let mut mesh_property = mesh.mesh_property.lock().unwrap();
    mesh_property.on_change.remove(cb);
}
#[no_mangle]
pub unsafe extern "C" fn add_onchange_callback(mesh_id: usize) -> ExplicitFreeListIndex {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[mesh_id];
    let mut mesh_property = mesh.mesh_property.lock().unwrap();
    let id = mesh_property.on_change.insert(Box::new(|mesh_property| {
        let mut devtools = DEVTOOLS.write().unwrap();
        mesh_property
            .rotation
            .to_euler_angles(&mut devtools.euler_angles);
        devtools.translation = mesh_property.translation.0.clone();
        devtools.scale = mesh_property.scaling.clone();
    }));
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
    pub on_change: ExplicitFreeList<Box<dyn Fn(&MutexGuard<MeshProperty>) -> () + Send>>,
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
            if !sub_3x3.invert_in_place() {
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
    fn update_translation(&mut self, x: f32, y: f32, z: f32) {
        self.translation.0 = [x, y, z];
    }
    pub fn update_scale(&mut self, x: f32, y: f32, z: f32) {
        self.scaling[0] = x;
        self.scaling[1] = y;
        self.scaling[2] = z;
    }
    pub fn update_euler_angles(&mut self, x: f32, y: f32, z: f32) {
        self.rotation = Quaternion::from_euler(&[x, y, z]);
    }
    pub fn update_rotation(&mut self, x: f32, y: f32, z: f32, w: f32) {
        self.rotation.i = x;
        self.rotation.j = y;
        self.rotation.k = z;
        self.rotation.w = w;
    }
    pub fn update_color(&mut self, data_0: f32, data_1: f32, data_2: f32, data_3: f32) {
        self.color[0] = data_0;
        self.color[1] = data_1;
        self.color[2] = data_2;
        self.color[3] = data_3;
    }
    pub fn set_scenes(&mut self, scenes: u32) {
        self.gpu_memory.scenes = scenes;
    }
    pub fn update_scale_and_rotation(
        &mut self,
        x: f32,
        y: f32,
        z: f32,
        rx: f32,
        ry: f32,
        rz: f32,
        rw: f32,
    ) {
        self.scaling[0] = x;
        self.scaling[1] = y;
        self.scaling[2] = z;
        self.rotation.i = rx;
        self.rotation.j = ry;
        self.rotation.k = rz;
        self.rotation.w = rw;
    }
    pub fn set_point_light(&mut self, range: f32) {
        let gpu_mesh_alignment = self.gpu_mesh_alignment.clone();
        self.gpu_memory.set_point_light(range, gpu_mesh_alignment);
    }
    pub fn set_directional_light(&mut self, range: f32) {
        let gpu_mesh_alignment = self.gpu_mesh_alignment.clone();
        self.gpu_memory
            .set_directional_light(range, gpu_mesh_alignment);
    }
}
