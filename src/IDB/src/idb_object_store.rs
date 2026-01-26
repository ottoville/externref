use std::marker::PhantomData;

use externref::Resource;

use crate::idb_get_result::IDBGetResult;
use crate::idb_index::IDBIndex;
use crate::idb_index::JSIDBIndex;
use crate::idb_key::autoincrement_key::IDBKeyWithAutoIncrement;
use crate::idb_key::idb_key::IDBKey;
use crate::idb_key::idb_key::IDBKeyNoAutoIncrement;
use crate::idb_key::idb_key::IDBReturnKeyOutput;
use crate::idb_key_result::IDBValidKey;
use crate::idb_request::IDBRequest;
use crate::idb_request::JSIDBRequest;
use crate::stringarray::JSStringArray;
use crate::stringarray::StringArray;

#[cfg(not(target_arch = "wasm32"))]
unsafe fn create_index(
    _object_store: &Resource<JSIDBObjectStore>,
    _name: usize,
    _name_len: usize,
    _keypath: &Resource<JSStringArray>,
    _multientry: bool,
    _unique: bool,
) -> Resource<JSIDBIndex> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn get(
    _object_store: &Resource<JSIDBObjectStore>,
    _key_ptr: usize,
    _key_len: usize,
) -> Resource<JSIDBRequest> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn put(
    _object_store: &Resource<JSIDBObjectStore>,
    _data_ptr: usize,
    _byte_len: usize,
) -> Resource<JSIDBRequest> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn get_with_number(
    _object_store: &Resource<JSIDBObjectStore>,
    _key: u32,
) -> Resource<JSIDBRequest> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn get_with_array_key(
    _object_store: &Resource<JSIDBObjectStore>,
    _keypath: &Resource<JSStringArray>,
) -> Resource<JSIDBRequest> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn put_with_key(
    _object_store: &Resource<JSIDBObjectStore>,
    _data_ptr: usize,
    _byte_len: usize,
    _key_ptr: usize,
    _key_len: usize,
) -> Resource<JSIDBRequest> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn put_with_array_key(
    _object_store: &Resource<JSIDBObjectStore>,
    _data_ptr: usize,
    _byte_len: usize,
    _key: &Resource<JSStringArray>,
) -> Resource<JSIDBRequest> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "idb_objectStore")]
extern "C" {
    pub fn create_index(
        object_store: &Resource<JSIDBObjectStore>,
        name: usize,
        name_len: usize,
        keypath: &Resource<JSStringArray>,
        multientry: bool,
        unique: bool,
    ) -> Resource<JSIDBIndex>;
    pub fn get(
        object_store: &Resource<JSIDBObjectStore>,
        key_ptr: usize,
        key_len: usize,
    ) -> Resource<JSIDBRequest>;
    pub fn get_with_number(
        object_store: &Resource<JSIDBObjectStore>,
        key: u32,
    ) -> Resource<JSIDBRequest>;
    pub fn get_with_array_key(
        object_store: &Resource<JSIDBObjectStore>,
        keypath: &Resource<JSStringArray>,
    ) -> Resource<JSIDBRequest>;

    pub fn put(
        object_store: &Resource<JSIDBObjectStore>,
        data_ptr: usize,
        byte_len: usize,
    ) -> Resource<JSIDBRequest>;
    pub fn put_with_key(
        object_store: &Resource<JSIDBObjectStore>,
        data_ptr: usize,
        byte_len: usize,
        key_ptr: usize,
        key_len: usize,
    ) -> Resource<JSIDBRequest>;
    pub fn put_with_array_key(
        object_store: &Resource<JSIDBObjectStore>,
        data_ptr: usize,
        byte_len: usize,
        key: &Resource<JSStringArray>,
    ) -> Resource<JSIDBRequest>;

}
pub struct ObjectStoreDefinition<KeyType> {
    pub keypath: PhantomData<KeyType>,
    pub to_number: u32,
}
pub trait ObjectStoreTrait {
    fn to_number(&self) -> u32;
}
impl<KeyType> ObjectStoreTrait for ObjectStoreDefinition<KeyType> {
    fn to_number(&self) -> u32 {
        self.to_number
    }
}

pub struct JSIDBObjectStore();
pub struct IDBObjectStore<KeyType, const UPDATE_NEEDED: bool, const READ_WRITE: bool> {
    pub externref: Resource<JSIDBObjectStore>,
    pub phantom: PhantomData<KeyType>,
}
impl<KeyType, const READ_WRITE: bool> IDBObjectStore<KeyType, true, READ_WRITE> {
    pub fn create_index<const MULTIENTRY: bool, const UNIQUE: bool, const N: usize>(
        &self,
        name: String,
        keypath: [String; N],
    ) -> IDBIndex {
        let keypath = StringArray::from(&keypath);
        IDBIndex {
            externref: unsafe {
                create_index(
                    &self.externref,
                    name.as_ptr() as usize,
                    name.len(),
                    &keypath.externref,
                    MULTIENTRY,
                    UNIQUE,
                )
            },
        }
    }
}

impl<const UPDATE_NEEDED: bool, T: IDBKey, const READ_WRITE: bool>
    IDBObjectStore<T, UPDATE_NEEDED, READ_WRITE>
{
    pub fn get<D: 'static>(&self, key: T) -> IDBRequest<IDBGetResult<D>> {
        IDBRequest::new(key.get(&self.externref))
    }
}
impl<const UPDATE_NEEDED: bool, T: IDBKeyNoAutoIncrement + IDBKey>
    IDBObjectStore<T, UPDATE_NEEDED, true>
{
    pub fn put<D>(&self, data: &D, key: T) -> IDBRequest<IDBValidKey<<T as IDBKey>::OutputType>>
    where
        <T as IDBKey>::OutputType: 'static + IDBReturnKeyOutput<InputType = Resource<()>>,
    {
        IDBRequest::new(key.put(&self.externref, data as *const D as usize, size_of::<D>()))
    }
}
impl<const UPDATE_NEEDED: bool, T: IDBKeyWithAutoIncrement + IDBKey + 'static>
    IDBObjectStore<T, UPDATE_NEEDED, true>
where
    <T as IDBKey>::OutputType: IDBReturnKeyOutput<InputType = u32>,
{
    pub fn put_with_autoincrement<D>(
        &self,
        data: &D,
    ) -> IDBRequest<IDBValidKey<<T as IDBKey>::OutputType>> {
        IDBRequest::new(unsafe { put(&self.externref, data as *const D as usize, size_of::<D>()) })
    }
}
