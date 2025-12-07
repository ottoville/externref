use std::{
    cell::RefCell,
    num::{NonZero, NonZeroU32, NonZeroUsize},
    rc::Rc,
    sync::atomic::AtomicU32,
};

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;
use externref::Resource;
use webgpu::{
    bindgroup::{
        bindgroup::BindGroup, bindgroup_entry::BindGroupBinding, bufferbinding::BufferBinding,
        texturebinding::TextureBinding,
    },
    bindgroup_layout::BindGroupLayout,
    buffer::buffer::GPUBuffer,
    buffer_binding_layout::{BufferBindingType, GPUBindingLayout},
    device::JSDevice,
    texture::{
        texture::{Texture, TextureAspect, TextureViewDimension},
        texture_formats::BGRA8UNORM,
        texture_view::TextureView,
    },
};

use crate::{
    gpu::{
        renderbundle_encoder::BindGroupType2,
        shader::{SHADER_STAGE_FRAGMENT, SHADER_STAGE_VERTEX},
    },
    mesh::{Mesh, ENGINE},
    vertices::{Position2DAndUV, VertexKind},
    Geometry,
};

static UI_ID: AtomicU32 = AtomicU32::new(0);
#[no_mangle]
pub unsafe extern "C" fn create_ui_mesh(
    position_count: usize,
) -> *mut ExplicitGenerationalFreeListIndex<fn() -> Mesh> {
    // TODO: prepend actual ui element label
    let mut label = String::from("UIRectangle");
    label.push_str(
        &UI_ID
            .fetch_add(1, std::sync::atomic::Ordering::Release)
            .to_string(),
    );

    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id = Mesh::new(0.0, 0.0, 1.0, 0, label, None, None, &mut meshes, false);
    let geometry = create_ui_geometry(position_count);
    let mesh = &mut meshes[&mesh_id];
    mesh.geometry = Some(Box::new(geometry));
    Box::into_raw(Box::new(mesh_id))
}
#[no_mangle]
pub unsafe extern "C" fn create_ui_texture(
    device: &Resource<JSDevice>,
    width: u32,
    height: u32,
) -> *const Texture<BGRA8UNORM, 2, 1, 1, 1, false, true, true, false, true> {
    let texture = Texture::<BGRA8UNORM, 2, 1, 1, 1, false, true, true, false, true>::new(
        device,
        NonZeroU32::new(width).unwrap(),
        NonZeroU32::new(height).unwrap(),
        String::from("TODO0"),
    );
    Box::into_raw(Box::new(texture))
}
pub fn create_ui_geometry(position_count: usize) -> Geometry {
    let mut geometry = Geometry::new(false, false, false, "UI".to_string());

    let mut vertices: Vec<Position2DAndUV> = Vec::with_capacity(position_count);
    unsafe { vertices.set_len(position_count) };
    geometry.set_vertices(VertexKind::Position2DAndUV(vertices));
    return geometry;
}
#[externref::externref]
#[no_mangle]
pub unsafe extern "C" fn create_ui_bindgroup(
    device: &Resource<JSDevice>,
    uniform_buffer: *const Rc<RefCell<GPUBuffer<false, false, false, true, false, false, true>>>,
    texture: *mut Rc<Texture<BGRA8UNORM, 2, 1, 1, 1, false, false, true, false, true>>,
) -> BindGroupType2 {
    let layout = BindGroupLayout::new(
        device,
        String::from("BindGroupLayoutUI"),
        [
            &GPUBindingLayout::<SHADER_STAGE_FRAGMENT>::new_texture(
                0,
                0,
                TextureViewDimension::D2,
                false,
            ),
            &GPUBindingLayout::<SHADER_STAGE_VERTEX>::new_buffer(
                1,
                BufferBindingType::Uniform,
                false,
                8,
            ),
        ],
    );
    let view = TextureView::<BGRA8UNORM, 1, false, false, true, false, true>::new(
        (*texture).clone(),
        String::from("TODO1"),
        TextureViewDimension::D2,
        TextureAspect::All,
    );
    let bufferbindings: [Rc<RefCell<dyn BindGroupBinding>>; 2] = [
        Rc::new(RefCell::new(TextureBinding::new(view))),
        BufferBinding::new(
            (*uniform_buffer).clone(),
            0,
            Some(unsafe { NonZero::new_unchecked(8) }),
        ),
    ];
    Box::into_raw(Box::new(BindGroup::new(
        String::from("UI_bindgroup"),
        &layout,
        bufferbindings,
    )))
}
pub struct UIRectangle {
    texture_bindgroup: Rc<BindGroup<2>>,
    uniform_buffer: Rc<RefCell<GPUBuffer<false, false, false, true, false, false, true>>>,
    mesh: ExplicitGenerationalFreeListIndex<fn() -> Mesh>,
}

impl UIRectangle {
    fn new(
        layout: &BindGroupLayout<2>,
        texture: Rc<Texture<BGRA8UNORM, 2, 1, 1, 1, false, true, true, false, true>>,
        device: &Resource<JSDevice>,
    ) -> Self {
        let uniform_buffer = Rc::new(RefCell::new(GPUBuffer::new(
            device,
            unsafe { NonZeroUsize::new_unchecked(8) },
            String::from("UI_transform"),
        )));
        // TODO: prepend actual ui element label
        let mut label = String::from("UIRectangle");
        label.push_str(
            &UI_ID
                .fetch_add(1, std::sync::atomic::Ordering::Release)
                .to_string(),
        );

        let mut meshes = ENGINE.meshes.lock().unwrap();
        let mesh = Mesh::new(0.0, 0.0, 1.0, 0, label, None, None, &mut meshes, false);
        let view = TextureView::<BGRA8UNORM, 1, false, true, true, false, true>::new(
            texture,
            String::from("TODO3"),
            TextureViewDimension::D2,
            TextureAspect::All,
        );
        let bufferbindings: [Rc<RefCell<dyn BindGroupBinding>>; 2] = [
            Rc::new(RefCell::new(TextureBinding::new(view))),
            BufferBinding::new(
                uniform_buffer.clone(),
                0,
                Some(unsafe { NonZero::new_unchecked(8) }),
            ),
        ];
        UIRectangle {
            texture_bindgroup: BindGroup::new(String::from("TODO4"), layout, bufferbindings),
            mesh,
            uniform_buffer,
        }
    }
}
