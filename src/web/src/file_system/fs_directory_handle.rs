use std::ptr;

use externref::Resource;

use crate::file_system::fs_file_handle::FSFileHandle;
use crate::file_system::fs_file_handle::FSFileHandleCb;
use crate::file_system::fs_handle::FSHandle;
use crate::file_system::fs_handle::FSKind;
use crate::primitives::jsstring::JSString;
use crate::primitives::jsstring::JSStringExtern;

pub type FSDirectoryCb = *mut *mut dyn FnOnce(
    Result<(Resource<FSDirectoryHandleExtern>, Resource<JSStringExtern>), Resource<JSStringExtern>>,
);
pub type FSEntryIteratorCb = *mut *mut dyn Fn(FSHandleEnum) -> bool;

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn entries(_directory: &Resource<FSDirectoryHandleExtern>, _cb: FSEntryIteratorCb) {}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn get_directory_handle(
    _directory: &Resource<FSDirectoryHandleExtern>,
    _name: usize,
    _create: bool,
    _cb: FSDirectoryCb,
) {
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn get_file_handle(
    _directory: &Resource<FSDirectoryHandleExtern>,
    _name: usize,
    _create: bool,
    _cb: FSFileHandleCb,
) {
}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "FSDirectoryHandle")]
extern "C" {
    pub fn entries(directory: &Resource<FSDirectoryHandleExtern>, cb: FSEntryIteratorCb);
    pub fn get_directory_handle(
        directory: &Resource<FSDirectoryHandleExtern>,
        name: usize,
        create: bool,
        cb: FSDirectoryCb,
    );
    pub fn get_file_handle(
        directory: &Resource<FSDirectoryHandleExtern>,
        name: usize,
        create: bool,
        cb: FSFileHandleCb,
    );
}

#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn get_directory_callback(
    callback: FSDirectoryCb,
    directory: Resource<FSDirectoryHandleExtern>,
    name: Resource<JSStringExtern>,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Ok((directory, name)));
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn get_directory_callback_error(
    callback: FSDirectoryCb,
    error: Resource<JSStringExtern>,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Err(error));
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn entry_iterator_callback(
    callback: FSEntryIteratorCb,
    name: Resource<JSStringExtern>,
    handle: Resource<()>,
    is_file: bool,
) -> bool {
    let handle_enum = if is_file {
        FSHandleEnum::File(FSFileHandle::new(
            JSString::new(name),
            handle.downcast_unchecked(),
        ))
    } else {
        FSHandleEnum::Directory(FSDirectoryHandle::new(
            JSString::new(name),
            handle.downcast_unchecked(),
        ))
    };
    (**callback)(handle_enum)
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn entry_iterator_callback_end(callback: FSEntryIteratorCb) {
    drop(Box::from_raw(*Box::from_raw(callback)));
}

pub struct FSDirectoryHandleExtern {}
pub struct FSDirectoryHandle {
    externref: Resource<FSDirectoryHandleExtern>,
    name: JSString,
}
pub enum FSHandleEnum {
    File(FSFileHandle),
    Directory(FSDirectoryHandle),
}
impl FSDirectoryHandle {
    pub fn new(name: JSString, externref: Resource<FSDirectoryHandleExtern>) -> Self {
        FSDirectoryHandle { externref, name }
    }
    pub fn entries(&self, cb: impl Fn(FSHandleEnum) -> bool + 'static) {
        unsafe {
            entries(
                &self.externref,
                Box::into_raw(Box::new(Box::into_raw(Box::new(cb)))),
            )
        }
    }
    pub fn get_directory_handle<const CREATE: bool>(
        &self,
        name: String,
        cb: impl FnOnce(Result<FSDirectoryHandle, JSString>) + 'static,
    ) {
        let jsname = JSString::from(name);

        unsafe {
            get_directory_handle(
                &self.externref,
                ptr::read(&jsname.externref as *const Resource<JSStringExtern> as *const usize),
                CREATE,
                Box::into_raw(Box::new(Box::into_raw(Box::new(move |value| {
                    cb(value
                        .map(|(directory, _)| FSDirectoryHandle::new(jsname, directory))
                        .map_err(|err| JSString::new(err)))
                })))),
            )
        }
    }
    pub fn get_file_handle<const CREATE: bool>(
        &self,
        name: &String,
        cb: impl FnOnce(Result<FSFileHandle, JSString>) + 'static,
    ) {
        let jsname = JSString::from(name);
        unsafe {
            get_file_handle(
                &self.externref,
                ptr::read(&jsname.externref as *const Resource<JSStringExtern> as *const usize),
                CREATE,
                Box::into_raw(Box::new(Box::into_raw(Box::new(move |value| {
                    cb(value
                        .map(|filehandle| FSFileHandle::new(jsname, filehandle))
                        .map_err(|err| JSString::new(err)))
                })))),
            )
        }
    }
}
impl FSHandle for FSDirectoryHandle {
    fn kind(&self) -> FSKind {
        FSKind::Directory
    }

    fn name(&self) -> &JSString {
        &self.name
    }
}
/*impl Clone for FSDirectoryHandle {
    fn clone(&self) -> Self {
        Self { externref: self.externref.clone(), name: self.name.clone() }
    }
}*/
