use std::ptr;

use externref::Resource;

use crate::file_system::callback::create_cb_box;
use crate::file_system::fs_handle::FSHandle;
use crate::file_system::fs_handle::FSKind;
use crate::file_system::fs_writable_file_stream::FSCreateWritableCb;
use crate::file_system::fs_writable_file_stream::FSWritableFileStream;
use crate::file_system::fs_writable_file_stream_exclusive::ExclusiveFSWritableFileStream;
use crate::file_system::fs_writable_file_stream_exclusive::FSCreateExclusiveWritableCb;
use crate::primitives::file::File;
use crate::primitives::file::FileExtern;
use crate::primitives::jsstring::JSString;
use crate::primitives::jsstring::JSStringExtern;

pub type FSFileHandleCb =
    *mut *mut dyn FnOnce(Result<Resource<FSFileHandleExtern>, Resource<JSStringExtern>>);
pub type FSFileCb = *mut *mut dyn FnOnce(Result<File, JSString>);
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_writable(
    _filehandle: &Resource<FSFileHandleExtern>,
    _keep_existing_data: bool,
    _cb: FSCreateWritableCb,
) {
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_writable_exclusive(
    _filehandle: usize,
    _rust_filehandle: *mut FSFileHandle,
    _keep_existing_data: bool,
    _cb: FSCreateExclusiveWritableCb,
) {
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn get_file(_filehandle: &Resource<FSFileHandleExtern>, _cb: FSFileCb) {}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "FSFileHandle")]
extern "C" {
    pub fn create_writable(
        filehandle: &Resource<FSFileHandleExtern>,
        keep_existing_data: bool,
        cb: FSCreateWritableCb,
    );
    pub fn create_writable_exclusive(
        filehandle: usize,
        rust_filehandle: *mut FSFileHandle,
        keep_existing_data: bool,
        cb: FSCreateExclusiveWritableCb,
    );
    pub fn get_file(filehandle: &Resource<FSFileHandleExtern>, cb: FSFileCb);
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn get_file_handle_callback(
    callback: FSFileHandleCb,
    file: Resource<FSFileHandleExtern>,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Ok(file));
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn get_file_handle_callback_error(
    callback: FSFileHandleCb,
    error: Resource<JSStringExtern>,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Err(error));
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn get_file_callback(callback: FSFileCb, file: Resource<FileExtern>) {
    Box::from_raw(*Box::from_raw(callback))(Result::Ok(File::new(file)));
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn get_file_callback_error(
    callback: FSFileCb,
    error: Resource<JSStringExtern>,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Err(JSString::new(error)));
}
pub struct FSFileHandleExtern {}
pub struct FSFileHandle {
    externref: Resource<FSFileHandleExtern>,
    name: JSString,
}
impl FSFileHandle {
    pub fn new(name: JSString, externref: Resource<FSFileHandleExtern>) -> Self {
        FSFileHandle { name, externref }
    }
    /// EXCLUSIVE: Only one writer can exist at a time
    pub fn create_writable<const KEEP_EXISTING_DATA: bool>(
        &self,
        cb: impl FnOnce(Result<FSWritableFileStream, JSString>) + 'static,
    ) {
        unsafe {
            create_writable(&self.externref, KEEP_EXISTING_DATA, create_cb_box(cb));
        }
    }
    pub fn create_writable_exclusive<const KEEP_EXISTING_DATA: bool>(
        self,
        cb: impl FnOnce(Result<ExclusiveFSWritableFileStream, (FSFileHandle, JSString)>) + 'static,
    ) {
        unsafe {
            create_writable_exclusive(
                ptr::read(&self.externref as *const Resource<FSFileHandleExtern> as *const usize),
                Box::into_raw(Box::new(self)),
                KEEP_EXISTING_DATA,
                Box::into_raw(Box::new(Box::into_raw(Box::new(|resource| cb(resource))))),
            );
        }
    }
    pub fn get_file(&self, cb: impl FnOnce(Result<File, JSString>) + 'static) {
        unsafe {
            get_file(&self.externref, create_cb_box(cb));
        }
    }
}
impl FSHandle for FSFileHandle {
    fn kind(&self) -> FSKind {
        FSKind::File
    }

    fn name(&self) -> &JSString {
        &self.name
    }
}
