use externref::Resource;

use crate::{
    idb_key::idb_key::{AutoIncrement, IDBKey, IDBReturnKeyOutput},
    idb_object_store::{get_with_number, JSIDBObjectStore},
    idb_request::JSIDBRequest,
};

pub trait IDBKeyWithAutoIncrement: IDBKey {}

impl IDBKey for AutoIncrement {
    type OutputType = AutoIncrement;

    fn get(self, object_store: &Resource<JSIDBObjectStore>) -> Resource<JSIDBRequest> {
        unsafe { get_with_number(object_store, self.0) }
    }
}
impl IDBReturnKeyOutput for AutoIncrement {
    type InputType = u32;
    type OutputType = u32;
    fn key_from_externref(externref: Self::InputType) -> Self::OutputType {
        externref
    }
}
impl IDBKeyWithAutoIncrement for AutoIncrement {}
