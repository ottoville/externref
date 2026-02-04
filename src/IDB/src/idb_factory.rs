use externref::Resource;
use web::storage_buckets::storage_buckets::NavigatorStorageBuckets;
use web::primitives::jsstring::JSStringExtern;

use crate::idb_open_request::IDBOpenRequest;
use crate::idb_request::JSIDBRequest;

pub struct JSIndexedDB();

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn open(
    _name: &Resource<JSStringExtern>,
    _version: u32,
    _root: &Resource<()>,
) -> Resource<JSIDBRequest> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "idb_factory")]
extern "C" {
    pub fn open(
        name: &Resource<JSStringExtern>,
        version: u32,
        root: &Resource<()>,
    ) -> Resource<JSIDBRequest>;
}
pub struct IDBFactory {}
impl IDBFactory {
    pub fn open(name: String, version: u32, window: Resource<()>) -> IDBOpenRequest {
        IDBOpenRequest::new(name, version, window)
    }
    pub fn open_with_storage_bucket(
        name: String,
        version: u32,
        storage_bucket: &NavigatorStorageBuckets,
    ) -> IDBOpenRequest {
        IDBOpenRequest::new_with_storage_bucket(name, version, storage_bucket)
    }
}
