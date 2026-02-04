use externref::Resource;

use crate::primitives::jsstring::JSString;
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn error(_resource: &Resource<()>) {}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn log(_resource: &Resource<()>) {}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "console")]
extern "C" {
    pub fn error(resource: &Resource<()>);
    pub fn log(resource: &Resource<()>);
}

pub struct Console {}
impl Console {
    pub fn error(resource: &JSString) {
        unsafe { error(resource.externref.upcast_ref()) }
    }
    pub fn log(resource: &JSString) {
        unsafe { log(resource.externref.upcast_ref()) }
    }
}
