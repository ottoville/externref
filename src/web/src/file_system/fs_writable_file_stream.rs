use std::{num::NonZeroUsize, ops::Deref};

use externref::Resource;

use crate::primitives::jsstring::{JSString, JSStringExtern};
use crate::writable_stream::writable_stream::WritableStream;
pub type FSCreateWritableCb = *mut *mut dyn FnOnce(Result<FSWritableFileStream, JSString>);
pub type FSCreateWriteCb = *mut *mut dyn FnOnce(Option<JSString>);

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn write(
    _stream: &Resource<()>,
    _ptr: usize,
    _byte_len: NonZeroUsize,
    _position: usize,
    _cb: FSCreateWriteCb,
) {
}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "FSWritableStream")]
unsafe extern "C" {
    pub fn write(
        stream: &Resource<()>,
        ptr: usize,
        byte_len: NonZeroUsize,
        position: usize,
        cb: FSCreateWriteCb,
    );
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn write_ok(callback: FSCreateWriteCb) {
    Box::from_raw(*Box::from_raw(callback))(None);
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn write_error(callback: FSCreateWriteCb, error: Resource<JSStringExtern>) {
    Box::from_raw(*Box::from_raw(callback))(Some(JSString::new(error)));
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn create_writable_callback(
    callback: FSCreateWritableCb,
    stream: Resource<FSWritableFileStreamExtern>,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Ok(FSWritableFileStream::new(stream)));
}

#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn create_writable_callback_error(
    callback: FSCreateWritableCb,
    error: Resource<JSStringExtern>,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Err(JSString::new(error)));
}

pub struct FSWritableFileStreamExtern();

pub struct FSWritableFileStream {
    writable_stream: WritableStream,
}
impl FSWritableFileStream {
    pub fn new(externref: Resource<FSWritableFileStreamExtern>) -> Self {
        FSWritableFileStream {
            writable_stream: WritableStream::new(unsafe {
                externref.upcast().downcast_unchecked()
            }),
        }
    }
    pub fn close(self) {
        self.writable_stream.close();
    }

    pub fn write<D>(&self, data: &D, position: usize, cb: impl FnOnce(Option<JSString>) + 'static) {
        unsafe {
            write(
                self.writable_stream.externref.upcast_ref(),
                data as *const D as usize,
                NonZeroUsize::new(size_of::<D>()).unwrap(),
                position,
                Box::into_raw(Box::new(Box::into_raw(Box::new(cb)))),
            );
        }
    }
    pub fn write_raw(
        &self,
        ptr: usize,
        size: NonZeroUsize,
        position: usize,
        cb: impl FnOnce(Option<JSString>) + 'static,
    ) {
        unsafe {
            write(
                self.writable_stream.externref.upcast_ref(),
                ptr,
                size,
                position,
                Box::into_raw(Box::new(Box::into_raw(Box::new(cb)))),
            );
        }
    }
}
impl Deref for FSWritableFileStream {
    type Target = WritableStream;

    fn deref(&self) -> &Self::Target {
        &self.writable_stream
    }
}
