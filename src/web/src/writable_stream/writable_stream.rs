use externref::Resource;

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn close(_stream: &Resource<WritableStreamExtern>) {}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "WritableStream")]
unsafe extern "C" {
    pub fn close(stream: &Resource<WritableStreamExtern>);
}
pub struct WritableStreamExtern();
pub struct WritableStream {
    pub externref: Resource<WritableStreamExtern>,
}
impl WritableStream {
    pub fn new(externref: Resource<WritableStreamExtern>) -> Self {
        WritableStream { externref }
    }
    pub fn close(self) {
        unsafe {
            close(&self.externref);
        }
    }
}
