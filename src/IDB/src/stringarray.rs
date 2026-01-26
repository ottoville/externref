use externref::Resource;

use crate::jsstring::{JSString, JSStringExtern};

#[cfg(not(target_arch = "wasm32"))]
unsafe fn create_string_array(_value: &Resource<JSStringExtern>) -> Resource<JSStringArray> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn push_to_string_array(_string: &Resource<JSStringArray>, _value: &Resource<JSStringExtern>) {
}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "stringarray")]
extern "C" {
    pub fn create_string_array(value: &Resource<JSStringExtern>) -> Resource<JSStringArray>;
    pub fn push_to_string_array(string: &Resource<JSStringArray>, value: &Resource<JSStringExtern>);
}
pub struct JSStringArray();
pub struct StringArray {
    pub externref: Resource<JSStringArray>,
    vec: Option<Vec<JSString>>,
}
impl StringArray {
    pub fn new(externref: Resource<JSStringArray>) -> Self {
        Self {
            externref,
            vec: None,
        }
    }
    pub fn push(&mut self, value: JSString) {
        unsafe { push_to_string_array(&self.externref, &value.externref) };
        if let Some(vec) = &mut self.vec {
            vec.push(value);
        }
    }
}
impl<const N: usize> From<&[String; N]> for StringArray {
    fn from(value: &[String; N]) -> Self {
        let mut vec = Vec::with_capacity(N);
        let first = JSString::from(value[0].to_string());
        let externref = unsafe { create_string_array(&first.externref) };
        vec.push(first);
        for n in 1..N {
            let jsstring = JSString::from(value[n].to_string());
            unsafe { push_to_string_array(&externref, &jsstring.externref) };
            vec.push(jsstring);
        }
        Self {
            externref,
            vec: Some(vec),
        }
    }
}
