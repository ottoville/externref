use crate::idb_key::idb_key::{IDBKey, IDBReturnKeyOutput};
use crate::idb_object_store::{get_with_array_key, put_with_array_key};
use externref::Resource;

use crate::stringarray::StringArray;
use crate::{
    idb_key::idb_key::IDBKeyNoAutoIncrement, idb_object_store::JSIDBObjectStore,
    idb_request::JSIDBRequest,
};

impl<const N: usize> IDBKeyNoAutoIncrement for &[String; N] {
    fn put(
        &self,
        object_store: &Resource<JSIDBObjectStore>,
        data_ptr: usize,
        data_len: usize,
    ) -> Resource<JSIDBRequest> {
        let jsfieldnames = StringArray::from(*self);

        unsafe { put_with_array_key(&object_store, data_ptr, data_len, &jsfieldnames.externref) }
    }
}
impl<const N: usize> IDBKey for &[String; N] {
    type OutputType = [String; N];

    fn get(self, object_store: &Resource<JSIDBObjectStore>) -> Resource<JSIDBRequest> {
        unsafe { get_with_array_key(object_store, &StringArray::from(self).externref) }
    }
}
impl<const N: usize> IDBReturnKeyOutput for [String; N] {
    type InputType = Resource<()>;
    type OutputType = StringArray;

    fn key_from_externref(externref: Self::InputType) -> Self::OutputType {
        return StringArray::new(unsafe { externref.downcast_unchecked() });
    }
}
