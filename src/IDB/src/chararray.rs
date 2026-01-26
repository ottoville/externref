use externref::Resource;

use crate::stringarray::JSStringArray;

#[cfg(not(target_arch = "wasm32"))]
unsafe fn push_to_char_array(_arr: &Resource<JSStringArray>, _char: u32) {}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn create_char_array(_char: u32) -> Resource<JSStringArray> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "chararray")]
extern "C" {
    pub fn create_char_array(char: u32) -> Resource<JSStringArray>;
    pub fn push_to_char_array(arr: &Resource<JSStringArray>, char: u32);
}
pub struct CharArray {
    pub externref: Resource<JSStringArray>,
}
impl CharArray {
    pub fn new(char: u32) -> Self {
        Self {
            externref: unsafe { create_char_array(char) },
        }
    }
    pub fn push(&self, char: u32) {
        unsafe { push_to_char_array(&self.externref, char) };
    }
}
