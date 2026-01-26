use externref::Resource;

use crate::{idb_object_store::JSIDBObjectStore, idb_request::JSIDBRequest};
pub struct AutoIncrement(pub u32);

pub trait IDBKey {
    fn get(self, object_store: &Resource<JSIDBObjectStore>) -> Resource<JSIDBRequest>;
    type OutputType: IDBReturnKeyOutput;
}
pub trait IDBReturnKeyOutput {
    /// Raw type that is returned from JS
    type InputType;
    /// Key that is processed from raw key
    type OutputType;
    fn key_from_externref(externref: Self::InputType) -> Self::OutputType;
}
pub trait IDBKeyNoAutoIncrement: IDBKey {
    fn put(
        &self,
        object_store: &Resource<JSIDBObjectStore>,
        data_ptr: usize,
        data_len: usize,
    ) -> Resource<JSIDBRequest>;
}
