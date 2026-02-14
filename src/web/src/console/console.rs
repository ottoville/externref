use externref::Resource;

use crate::primitives::jsstring::JSString;
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn error(_resource: &Resource<()>) {}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn log(_resource: &Resource<()>) {}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn debug(_resource: &Resource<()>) {}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "console")]
extern "C" {
    pub fn error(resource: &Resource<()>);
    pub fn log(resource: &Resource<()>);
    pub fn debug(resource: &Resource<()>);
}

pub struct Console {}
impl Console {
    pub fn error(resource: impl Into<JSString>) {
        unsafe { error(resource.into().externref.upcast_ref()) }
    }
    pub fn log(resource: impl Into<JSString>) {
        unsafe { log(resource.into().externref.upcast_ref()) }
    }
    pub fn debug(resource: impl Into<JSString>) {
        unsafe { debug(resource.into().externref.upcast_ref()) }
    }
}
