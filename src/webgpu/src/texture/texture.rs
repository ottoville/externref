use externref::Resource;
use std::cell::RefCell;
use std::marker::PhantomData;
use std::num::NonZero;

use crate::bindgroup::bindgroup_entry::BindGroupBinding;
use crate::device::create_texture;
use crate::weakvec::WeakVec;
use crate::{
    device::JSDevice,
    texture::texture_formats::{TextureFormat, TextureFormatSRGB},
};

pub enum TextureDimension {
    D1,
    D2,
    D3,
}
#[derive(Clone, Copy)]
pub enum TextureViewDimension {
    D1,
    D2,
    Array2d,
    Cube,
    CubeArray,
    D3,
}
#[derive(Clone, Copy)]
pub enum TextureAspect {
    All,
    StencilOnly,
    DepthOnly,
}
pub struct JSTexture(());

#[cfg(not(target_arch = "wasm32"))]
unsafe fn destroy(_texture: &Resource<JSTexture>) {}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "texture")]
extern "C" {
    fn destroy(texture: &Resource<JSTexture>);
}
pub const fn usages_from_bools<
    const COPY_SRC: bool,
    const COPY_DST: bool,
    const TEXTURE_BINDING: bool,
    const STORAGE_BINDING: bool,
    const RENDER_ATTACHMENT: bool,
>() -> u32 {
    let mut usages = 0;
    if COPY_SRC {
        usages |= 0x0001;
    }
    if COPY_DST {
        usages |= 0x0002;
    }
    if TEXTURE_BINDING {
        usages |= 0x0004;
    }
    if STORAGE_BINDING {
        usages |= 0x0008;
    }
    if RENDER_ATTACHMENT {
        usages |= 0x0010;
    }
    return usages;
}

pub struct Texture<
    F: TextureFormat,
    const DIMENSION: u32,
    const SAMPLE_COUNT: u32,
    const DEPTH_OR_ARRAY_LAYERS: u32 = 1,
    const MIP_LEVEL_COUNT: u32 = 1,
    const COPY_SRC: bool = false,
    const COPY_DST: bool = false,
    const TEXTURE_BINDING: bool = false,
    const STORAGE_BINDING: bool = false,
    const RENDER_ATTACHMENT: bool = false,
    const SRGB_MULTIVIEW: bool = false,
> {
    pub externref: RefCell<(Resource<JSTexture>, u32)>,
    pub label: Option<String>,
    pub format: PhantomData<F>,
    pub bindings: RefCell<WeakVec<RefCell<dyn BindGroupBinding>>>,
}
pub trait TextureTrait {
    fn externref(&self) -> &RefCell<(Resource<JSTexture>, u32)>;
}
impl<
        F: TextureFormat,
        const DIMENSION: u32,
        const SAMPLE_COUNT: u32,
        const DEPTH_OR_ARRAY_LAYERS: u32,
        const MIP_LEVEL_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    > TextureTrait
    for Texture<
        F,
        DIMENSION,
        SAMPLE_COUNT,
        DEPTH_OR_ARRAY_LAYERS,
        MIP_LEVEL_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
{
    fn externref(&self) -> &RefCell<(Resource<JSTexture>, u32)> {
        &self.externref
    }
}
pub trait TextureDimensionTrait: TextureTrait {
    fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>);
}

// when dimension is 1 enforce sample count 1 and no render attachment
impl<
        F: TextureFormat,
        const MIP_LEVEL_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const SRGB_MULTIVIEW: bool,
    > TextureDimensionTrait
    for Texture<
        F,
        1,
        1,
        1,
        MIP_LEVEL_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        false,
        SRGB_MULTIVIEW,
    >
{
    fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        self.resize(device, width, height);
    }
}

// 2 dimension
impl<
        F: TextureFormat,
        const SAMPLE_COUNT: u32,
        const DEPTH_OR_ARRAY_LAYERS: u32,
        const MIP_LEVEL_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    > TextureDimensionTrait
    for Texture<
        F,
        2,
        DEPTH_OR_ARRAY_LAYERS,
        SAMPLE_COUNT,
        MIP_LEVEL_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
{
    fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        self.resize(device, width, height);
    }
}
// 3 dimension

impl<
        F: TextureFormat,
        const DEPTH_OR_ARRAY_LAYERS: u32,
        const MIP_LEVEL_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
    > TextureDimensionTrait
    for Texture<
        F,
        3,
        1,
        DEPTH_OR_ARRAY_LAYERS,
        MIP_LEVEL_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
    >
{
    fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        self.resize(device, width, height);
    }
}
impl<
        F: TextureFormat,
        const DIMENSION: u32,
        const SAMPLE_COUNT: u32,
        const DEPTH_OR_ARRAY_LAYERS: u32,
        const MIP_LEVEL_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    >
    Texture<
        F,
        DIMENSION,
        SAMPLE_COUNT,
        DEPTH_OR_ARRAY_LAYERS,
        MIP_LEVEL_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
where
    Self: TextureDimensionTrait,
{
    fn make_dirty(&self) {
        self.bindings.borrow_mut().iter(|binding| {
            binding.borrow_mut().make_dirty();
        });
    }
    pub const fn usages() -> u32 {
        return usages_from_bools::<
            COPY_SRC,
            COPY_DST,
            TEXTURE_BINDING,
            STORAGE_BINDING,
            RENDER_ATTACHMENT,
        >();
    }
    fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        let mut externref = self.externref.borrow_mut();
        *externref = unsafe {
            (
                create_texture(
                    device,
                    width.get(),
                    height.get(),
                    DEPTH_OR_ARRAY_LAYERS,
                    self.label.as_ref().unwrap().as_ptr() as usize,
                    self.label.as_ref().unwrap().len(),
                    Self::usages(),
                    MIP_LEVEL_COUNT,
                    SAMPLE_COUNT,
                    DIMENSION,
                    F::to_number(),
                    0,
                    0,
                ),
                externref.1 + 1,
            )
        };
        self.make_dirty();
    }
    /// # Creates new texture
    /// ## Should panic, 4 dimension texture does not exist
    /// ```compile_fail
    /// use crate::webgpu::texture::{texture::Texture, texture_formats::BGRA8UNORM};
    /// use externref::{ExternRef, Resource};
    /// use std::num::NonZeroU32;
    /// unsafe {
    /// let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
    /// let texture = Texture::<BGRA8UNORM, 4, 1,1,1, false, false, true, false, true>::new(
    ///     &device,
    ///    NonZeroU32::new_unchecked(300),
    ///    NonZeroU32::new_unchecked(300),
    ///    String::from("test"),
    /// );
    /// }
    /// ```
    pub fn new(
        device: &Resource<JSDevice>,
        width: NonZero<u32>,
        height: NonZero<u32>,
        label: String,
    ) -> Self {
        // descriptor.mipLevelCount must be > zero.
        const { assert!(MIP_LEVEL_COUNT > 0) };
        let externref = unsafe {
            create_texture(
                device,
                width.get(),
                height.get(),
                DEPTH_OR_ARRAY_LAYERS,
                label.as_ptr() as usize,
                label.len(),
                Self::usages(),
                MIP_LEVEL_COUNT,
                SAMPLE_COUNT,
                DIMENSION,
                F::to_number(),
                0,
                0,
            )
        };
        Texture {
            label: Some(label),
            externref: RefCell::new((externref, 0)),
            format: PhantomData,
            bindings: RefCell::new(WeakVec::new()),
        }
    }
    pub fn new_with_srgb_multiview<VF: TextureFormat>(
        device: &Resource<JSDevice>,
        width: NonZero<u32>,
        height: NonZero<u32>,
        label: String,
    ) -> Texture<
        F,
        DIMENSION,
        DEPTH_OR_ARRAY_LAYERS,
        SAMPLE_COUNT,
        MIP_LEVEL_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        true,
    >
    where
        F: TextureFormatSRGB<VF>,
    {
        const { assert!(MIP_LEVEL_COUNT > 0) };

        let variants = [F::to_number(), F::to_srgb()];
        let externref = unsafe {
            create_texture(
                device,
                width.get(),
                height.get(),
                DEPTH_OR_ARRAY_LAYERS,
                label.as_ptr() as usize,
                label.len(),
                Self::usages(),
                MIP_LEVEL_COUNT,
                SAMPLE_COUNT,
                DIMENSION,
                F::to_number(),
                variants.as_ptr() as usize,
                variants.len(),
            )
        };
        Texture {
            label: Some(label),
            externref: RefCell::new((externref, 0)),
            format: PhantomData,
            bindings: RefCell::new(WeakVec::new()),
        }
    }
}

impl<
        F: TextureFormat,
        const DIMENSION: u32,
        const SAMPLE_COUNT: u32,
        const DEPTH_OR_ARRAY_LAYERS: u32,
        const MIP_LEVEL_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    > Drop
    for Texture<
        F,
        DIMENSION,
        SAMPLE_COUNT,
        DEPTH_OR_ARRAY_LAYERS,
        MIP_LEVEL_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
{
    fn drop(&mut self) {
        unsafe { destroy(&self.externref.borrow().0) };
    }
}

#[cfg(test)]
#[test]
fn test_texture() {
    use crate::texture::texture_formats::BGRA8UNORM;
    use externref::ExternRef;
    use std::num::NonZeroU32;
    let device = unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) };
    unsafe {
        Texture::<BGRA8UNORM, 2, 4, 1, 1, false, false, true, false, true>::new(
            &device,
            NonZeroU32::new_unchecked(300),
            NonZeroU32::new_unchecked(300),
            String::from("test"),
        );
    }
}
