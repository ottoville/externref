use externref::Resource;
use std::ops::Deref;

use crate::{
    file_system::{
        fs_file_handle::FSFileHandle,
        fs_writable_file_stream::{FSWritableFileStream, FSWritableFileStreamExtern},
    },
    primitives::jsstring::{JSString, JSStringExtern},
};

#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn create_writable_callback_exclusive(
    callback: FSCreateExclusiveWritableCb,
    filesystemhandle: *mut FSFileHandle,
    stream: Resource<FSWritableFileStreamExtern>,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Ok(ExclusiveFSWritableFileStream::new(
        *Box::from_raw(filesystemhandle),
        stream,
    )));
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn create_writable_callback_error_exclusive(
    callback: FSCreateExclusiveWritableCb,
    filesystemhandle: *mut FSFileHandle,
    error: Resource<JSStringExtern>,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Err((
        *Box::from_raw(filesystemhandle),
        JSString::new(error),
    )));
}
pub type FSCreateExclusiveWritableCb =
    *mut *mut dyn FnOnce(Result<ExclusiveFSWritableFileStream, (FSFileHandle, JSString)>);

pub struct ExclusiveFSWritableFileStream {
    file: FSFileHandle,
    stream: FSWritableFileStream,
}
impl ExclusiveFSWritableFileStream {
    pub fn new(file: FSFileHandle, externref: Resource<FSWritableFileStreamExtern>) -> Self {
        Self {
            file,
            stream: FSWritableFileStream::new(externref),
        }
    }
    pub fn close(self) -> FSFileHandle {
        self.stream.close();
        self.file
    }
}
impl Deref for ExclusiveFSWritableFileStream {
    type Target = FSWritableFileStream;

    fn deref(&self) -> &Self::Target {
        &self.stream
    }
}
