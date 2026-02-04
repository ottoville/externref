use externref::Resource;
use web::{storage_buckets::storage_buckets::NavigatorStorageBuckets, primitives::jsstring::JSString};

use crate::{
    idb_database::{IDBDatabase, JSIDBDatabase},
    idb_factory::open,
    idb_request::{IDBRequest, JSIDBRequest},
    idb_update_needed_database::IDBUpdateNeededDatabase,
};

type OnUpgradeneededCb = *mut *mut dyn FnOnce(IDBUpdateNeededDatabase, u32, u32);
type OnBlockedCb = *mut *mut dyn FnOnce(u32, u32);

#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn idb_upgrade_needed(
    callback: OnUpgradeneededCb,
    database: Resource<JSIDBDatabase>,
    old_version: u32,
    new_version: u32,
) {
    Box::from_raw(*Box::from_raw(callback))(
        IDBUpdateNeededDatabase {
            database: IDBDatabase::from(database),
        },
        old_version,
        new_version,
    );
}

#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn idb_on_blocked(
    callback: OnUpgradeneededCb,
    database: Resource<JSIDBDatabase>,
    old_version: u32,
    new_version: u32,
) {
    Box::from_raw(*Box::from_raw(callback))(
        IDBUpdateNeededDatabase {
            database: IDBDatabase::from(database),
        },
        old_version,
        new_version,
    );
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn onupgradeneeded(_request: &Resource<JSIDBRequest>, _cb: OnUpgradeneededCb) {}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn onblocked(_request: &Resource<JSIDBRequest>, _cb: OnBlockedCb) {}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "idb_openDBRequest")]
extern "C" {
    pub fn onupgradeneeded(request: &Resource<JSIDBRequest>, cb: OnUpgradeneededCb);
    pub fn onblocked(request: &Resource<JSIDBRequest>, cb: OnBlockedCb);
}

pub struct IDBOpenRequest {
    pub request: IDBRequest<IDBDatabase>,
}
impl IDBOpenRequest {
    pub fn new(name: String, version: u32, window: Resource<()>) -> Self {
        let request = IDBOpenRequest {
            request: IDBRequest::new(unsafe {
                open(&JSString::from(name).externref, version, &window)
            }),
        };
        return request;
    }
    pub fn new_with_storage_bucket(
        name: String,
        version: u32,
        storage_bucket: &NavigatorStorageBuckets,
    ) -> Self {
        let request = IDBOpenRequest {
            request: IDBRequest::new(unsafe {
                open(
                    &JSString::from(name).externref,
                    version,
                    storage_bucket.externref.upcast_ref(),
                )
            }),
        };
        return request;
    }
    pub fn on_upgrade_needed(&self, cb: impl FnOnce(IDBUpdateNeededDatabase, u32, u32) + 'static) {
        unsafe {
            onupgradeneeded(
                &self.request.externref,
                Box::into_raw(Box::new(Box::into_raw(Box::new(cb)))),
            )
        }
    }
    pub fn on_blocked(&self, cb: impl FnOnce(u32, u32) + 'static) {
        unsafe {
            onblocked(
                &self.request.externref,
                Box::into_raw(Box::new(Box::into_raw(Box::new(cb)))),
            )
        }
    }
}
