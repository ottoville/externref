use crate::idb_result::IDBResult;
use externref::Resource;
use std::cell::OnceCell;
use std::mem::MaybeUninit;

#[cfg(not(target_arch = "wasm32"))]
unsafe fn set_get_value(_ptr: usize, _value: &Resource<()>) {}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "idb_objectStore")]
extern "C" {
    pub fn set_get_value(ptr: usize, value: &Resource<()>);
}

pub struct IDBGetResult<D> {
    pub data: OnceCell<D>,
}
impl<D> IDBResult for IDBGetResult<D> {
    type Externref = Resource<()>;
    type Output = Option<D>;
    fn new() -> Self {
        Self {
            data: OnceCell::new(),
        }
    }

    fn set_externref(&self, maybe_externref: Option<Self::Externref>) {
        if let Some(externref) = maybe_externref {
            let data: MaybeUninit<D> = MaybeUninit::uninit();
            unsafe { set_get_value(data.as_ptr() as usize, &externref) }
            _ = self.data.set(unsafe { data.assume_init() });
        }
    }

    fn output(mut self) -> Self::Output {
        self.data.take()
    }
}
