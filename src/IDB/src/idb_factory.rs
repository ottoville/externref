use externref::Resource;
use web::event::event::Event;
use web::primitives::jsstring::{JSString, JSStringExtern};
use web::storage_buckets::storage_buckets::NavigatorStorageBuckets;

use crate::idb_database::IDBDatabase;
use crate::idb_open_request::IDBOpenRequest;
use crate::idb_request::JSIDBRequest;
use crate::idb_result::IDBResult;

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
    pub fn open(
        name: String,
        version: u32,
        window: Resource<()>,
        cb: impl FnOnce(Result<<IDBDatabase as IDBResult>::Output, (&JSString, &Event)>) + 'static,
    ) -> IDBOpenRequest {
        IDBOpenRequest::new(name, version, window, cb)
    }
    pub fn open_with_storage_bucket(
        name: String,
        version: u32,
        storage_bucket: &NavigatorStorageBuckets,
        cb: impl FnOnce(Result<<IDBDatabase as IDBResult>::Output, (&JSString, &Event)>) + 'static,
    ) -> IDBOpenRequest {
        IDBOpenRequest::new_with_storage_bucket(name, version, storage_bucket, cb)
    }
}
