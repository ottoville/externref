use externref::{externref, Resource};

use crate::{
    file_system::fs_directory_handle::{FSDirectoryCb, FSDirectoryHandle},
    primitives::jsstring::{JSString, JSStringExtern},
};

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
#[cfg(not(target_arch = "wasm32"))]
unsafe fn get_directory(_storage_manager: &Resource<()>, _cb: FSDirectoryCb) {
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
    pub fn get_directory(storage_manager: &Resource<()>, cb: FSDirectoryCb);

}
pub struct JSStorageBucket();
type StorageBucketOpenCB = *mut *mut dyn FnOnce(NavigatorStorageBuckets);

pub struct StorageBuckets {}
pub struct NavigatorStorageBuckets {
    pub externref: Resource<JSStorageBucket>,
}
impl NavigatorStorageBuckets {
    pub fn get_directory(&self, cb: impl FnOnce(Result<FSDirectoryHandle, JSString>) + 'static) {
        unsafe {
            get_directory(
                self.externref.upcast_ref(),
                Box::into_raw(Box::new(Box::into_raw(Box::new(move |value| {
                    cb(value
                        .map(|(directory, name)| {
                            FSDirectoryHandle::new(JSString::new(name), directory)
                        })
                        .map_err(|err| JSString::new(err)))
                })))),
            )
        }
    }
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
