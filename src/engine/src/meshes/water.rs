use std::{cell::RefCell, rc::Rc};

use crate::{
    gpu::{gpu::GPU, renderbundle_encoder::BindGroupType2, shader::SHADER_STAGE_FRAGMENT},
    mesh::{Mesh, ENGINE},
    vertices::{Position, VertexKind},
    Geometry,
};
use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;
use webgpu::{
    bindgroup::{
        bindgroup::BindGroup, bindgroup_entry::BindGroupBinding, texturebinding::TextureBinding,
    },
    bindgroup_layout::BindGroupLayout,
    buffer_binding_layout::GPUBindingLayout,
    sampler::sampler::{GPUAddressMode, GPUFilterMode, GPUSampler},
    texture::{
        texture::{TextureAspect, TextureViewDimension},
        texture_formats::BGRA8UNORM,
        texture_view::TextureView,
    },
};

#[externref::externref]
#[no_mangle]
pub unsafe extern "C" fn create_water_bindgroup(gpu_ptr: *const GPU) -> BindGroupType2 {
    let gpu = &*gpu_ptr;

    let layout = BindGroupLayout::new(
        &gpu.device,
        String::from("lightsBindGroupTexture2water2"),
        [
            &GPUBindingLayout::<SHADER_STAGE_FRAGMENT>::new_texture(
                0,
                0,
                TextureViewDimension::D2,
                false,
            ),
            &GPUBindingLayout::<SHADER_STAGE_FRAGMENT>::new_sampler(1, 0),
        ],
    );
    let view = TextureView::<BGRA8UNORM, 1, false, false, true, false, true>::new(
        gpu.water_render_target.clone(),
        String::from("waterTexture"),
        TextureViewDimension::D2,
        TextureAspect::All,
    );
    //TODO: Reuse sampler with terrain.ts?
    let sampler = GPUSampler::new(
        &gpu.device,
        String::from("WaterTextureSampler"),
        GPUAddressMode::ClampToEdge,
        GPUAddressMode::ClampToEdge,
        GPUAddressMode::ClampToEdge,
        GPUFilterMode::Nearest,
        GPUFilterMode::Nearest,
        GPUFilterMode::Nearest,
        0.0,
        32.0,
        1,
    );
    let bufferbindings: [Rc<RefCell<dyn BindGroupBinding>>; 2] = [
        Rc::new(RefCell::new(TextureBinding::new(view))),
        Rc::new(RefCell::new(sampler)),
    ];
    Box::into_raw(Box::new(BindGroup::new(
        String::from("water_bindgroup"),
        &layout,
        bufferbindings,
    )))
}

#[no_mangle]
pub unsafe extern "C" fn create_water_mesh(
    scenes: f32,
) -> *mut ExplicitGenerationalFreeListIndex<fn() -> Mesh> {
    let label = String::from("Water");

    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id = Mesh::new(0.0, 0.0, scenes, 0, label, None, None, &mut meshes, false);
    let geometry = create_water_geometry();
    let mesh = &mut meshes[&mesh_id];
    mesh.geometry = Some(Box::new(geometry));
    Box::into_raw(Box::new(mesh_id))
}
pub fn create_water_geometry() -> Geometry {
    let vertices: Vec<Position> = vec![
        Position::new([-50000.0, 3.0, -50000.0]),
        Position::new([50000.0, 3.0, -50000.0]),
        Position::new([-50000.0, 3.0, 50000.0]),
        Position::new([50000.0, 3.0, 50000.0]),
    ];
    let mut geometry = Geometry::new(false, false, true, "water".to_string());
    geometry.set_vertices(VertexKind::Position(vertices));
    geometry
}
