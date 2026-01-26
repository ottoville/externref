use externref::Resource;

use crate::idb_open_request::IDBOpenRequest;
use crate::idb_request::JSIDBRequest;
use crate::storage_buckets::JSStorageBucket;
use crate::storage_buckets::NavigatorStorageBuckets;

pub struct JSIndexedDB();

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn open(_name_ptr: usize, _name_len: usize, _version: u32) -> Resource<JSIDBRequest> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn open_with_storage_bucket(
    _name_ptr: usize,
    _name_len: usize,
    _version: u32,
    _storage_bucket: &Resource<JSStorageBucket>,
) -> Resource<JSIDBRequest> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "idb_factory")]
extern "C" {
    pub fn open(name_ptr: usize, name_len: usize, version: u32) -> Resource<JSIDBRequest>;
    pub fn open_with_storage_bucket(
        name_ptr: usize,
        name_len: usize,
        version: u32,
        storage_bucket: &Resource<JSStorageBucket>,
    ) -> Resource<JSIDBRequest>;
}
pub struct IDBFactory {}
impl IDBFactory {
    pub fn open(name: String, version: u32) -> IDBOpenRequest {
        IDBOpenRequest::new(name, version)
    }
    pub fn open_with_storage_bucket(
        name: String,
        version: u32,
        storage_bucket: &NavigatorStorageBuckets,
    ) -> IDBOpenRequest {
        IDBOpenRequest::new_with_storage_bucket(name, version, storage_bucket)
    }
}
