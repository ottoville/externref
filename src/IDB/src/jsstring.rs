use std::mem;

use externref::Resource;

#[cfg(not(target_arch = "wasm32"))]
unsafe fn create_string(_ptr: usize, _len: usize) -> Resource<JSStringExtern> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn charCodeAt(_a: &Resource<JSStringExtern>, _i: u32) -> u32 {
    return 1;
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn equals(_a: &Resource<JSStringExtern>, _b: &Resource<JSStringExtern>) -> bool {
    true
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn from_externref(_externref: &Resource<JSStringExtern>, _ptr: usize, _len: usize) {}

#[cfg(not(target_arch = "wasm32"))]
unsafe fn length(_string: &Resource<JSStringExtern>) -> u32 {
    0
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn concat(
    _a: &Resource<JSStringExtern>,
    _b: &Resource<JSStringExtern>,
) -> Resource<JSStringExtern> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn cast(_string: &Resource<JSStringExtern>) -> Resource<()> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "string")]
extern "C" {
    fn create_string(ptr: usize, len: usize) -> Resource<JSStringExtern>;
    fn from_externref(externref: &Resource<JSStringExtern>, ptr: usize, len: usize);
}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "wasm:js-string")]
extern "C" {
    fn cast(string: &Resource<JSStringExtern>) -> Resource<()>;
    fn test(string: &Resource<JSStringExtern>) -> i32;
    fn fromCharCode(char_code: i32) -> Resource<()>;
    fn fromCodePoint(char_code: i32) -> Resource<()>;
    fn charCodeAt(a: &Resource<JSStringExtern>, i: u32) -> u32;
    fn codePointAt(a: &Resource<JSStringExtern>, i: i32) -> i32;
    fn length(string: &Resource<JSStringExtern>) -> u32;
    fn concat(
        a: &Resource<JSStringExtern>,
        b: &Resource<JSStringExtern>,
    ) -> Resource<JSStringExtern>;
    fn substring(
        string: &Resource<JSStringExtern>,
        start: i32,
        end: i32,
    ) -> Resource<JSStringExtern>;
    fn equals(a: &Resource<JSStringExtern>, b: &Resource<JSStringExtern>) -> bool;
    fn compare(
        a: &Resource<JSStringExtern>,
        b: &Resource<JSStringExtern>,
    ) -> Resource<JSStringExtern>;
}
pub struct JSStringExtern();
pub struct JSString {
    pub externref: Resource<JSStringExtern>,
    pub string: Option<String>,
}
impl JSString {
    pub fn new(externref: Resource<JSStringExtern>) -> Self {
        JSString {
            externref,
            string: None,
        }
    }
    pub fn cast(&self) -> &Self {
        unsafe { cast(&self.externref) };
        return self;
    }
    pub fn concat(&self, other: &Self) -> Self {
        let mut jsstring = JSString::new(unsafe { concat(&self.externref, &other.externref) });
        if let Some(string1) = &self.string {
            if let Some(string2) = &other.string {
                let mut concatted = String::with_capacity(string1.len() + string2.len());
                concatted.push_str(string1);
                concatted.push_str(string2);
                jsstring.string = Some(concatted)
            }
        }
        return jsstring;
    }
    pub fn len(&self) -> u32 {
        return unsafe { length(&self.externref) };
    }
    pub fn char_code_at(&self, i: u32) -> u32 {
        return unsafe { charCodeAt(&self.externref, i) };
    }
    pub fn get_as_string(&mut self) -> &String {
        self.string.get_or_insert_with(|| {
            let len = unsafe { length(&self.externref) } as usize;
            let s = String::with_capacity(len);
            let mut s = mem::ManuallyDrop::new(s);

            let ptr = s.as_mut_ptr();
            let capacity = s.capacity();
            unsafe { from_externref(&self.externref, ptr as usize, len) };
            unsafe { String::from_raw_parts(ptr, len, capacity) }
        })
    }
}
impl PartialEq for JSString {
    fn eq(&self, other: &Self) -> bool {
        unsafe { equals(&self.externref, &other.externref) }
    }
}
impl From<String> for JSString {
    fn from(value: String) -> Self {
        JSString {
            externref: unsafe { create_string(value.as_ptr() as usize, value.len()) },
            string: Some(value),
        }
    }
}
impl From<&str> for JSString {
    fn from(value: &str) -> Self {
        JSString {
            externref: unsafe { create_string(value.as_ptr() as usize, value.len()) },
            string: Some(value.to_owned()),
        }
    }
}
