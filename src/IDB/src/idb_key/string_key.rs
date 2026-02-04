use externref::Resource;
use web::primitives::jsstring::JSString;

use crate::{
    idb_key::idb_key::{IDBKey, IDBKeyNoAutoIncrement, IDBReturnKeyOutput},
    idb_object_store::{get, put_with_key, JSIDBObjectStore},
    idb_request::JSIDBRequest,
};

impl IDBKeyNoAutoIncrement for &String {
    fn put(
        &self,
        object_store: &Resource<JSIDBObjectStore>,
        data_ptr: usize,
        data_len: usize,
    ) -> Resource<JSIDBRequest> {
        unsafe {
            put_with_key(
                &object_store,
                data_ptr,
                data_len,
                self.as_ptr() as usize,
                self.len(),
            )
        }
    }
}

impl IDBKey for &String {
    type OutputType = String;

    fn get(self, object_store: &Resource<JSIDBObjectStore>) -> Resource<JSIDBRequest> {
        unsafe { get(object_store, self.as_ptr() as usize, self.len()) }
    }
}
impl IDBReturnKeyOutput for String {
    type InputType = Resource<()>;
    type OutputType = JSString;

    fn key_from_externref(externref: Self::InputType) -> Self::OutputType {
        return JSString::new(unsafe { externref.downcast_unchecked() });
    }
}
