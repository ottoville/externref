use externref::{externref, Resource};

use crate::jsstring::JSString;
use crate::jsstring::JSStringExtern;
#[no_mangle]
#[externref]
pub unsafe extern "C" fn storage_bucket_open(
    callback: StorageBucketOpenCB,
    externref: Resource<JSStorageBucket>,
) {
    Box::from_raw(*Box::from_raw(callback))(NavigatorStorageBuckets { externref });
}

#[cfg(not(target_arch = "wasm32"))]
unsafe fn open(
    _name: &Resource<JSStringExtern>,
    _persisted: bool,
    _quota: u32,
    _expires: f32,
    _cb: StorageBucketOpenCB,
) {
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "storage_buckets")]
extern "C" {
    pub fn open(
        name: &Resource<JSStringExtern>,
        persisted: bool,
        quota: u32,
        expires: f32,
        cb: StorageBucketOpenCB,
    );
}
pub struct JSStorageBucket();
type StorageBucketOpenCB = *mut *mut dyn FnOnce(NavigatorStorageBuckets);

pub struct StorageBuckets {}
pub struct NavigatorStorageBuckets {
    pub externref: Resource<JSStorageBucket>,
}
impl StorageBuckets {
    pub fn open(
        name: String,
        persisted: bool,
        quota: u32,
        expires: f32,
        cb: impl FnOnce(NavigatorStorageBuckets) + 'static,
    ) {
        unsafe {
            open(
                &JSString::from(name).externref,
                persisted,
                quota,
                expires,
                Box::into_raw(Box::new(Box::into_raw(Box::new(cb)))),
            )
        };
    }
}
