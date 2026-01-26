use std::marker::PhantomData;

use externref::Resource;

use crate::idb_database::IDBDatabase;
use crate::idb_database::JSIDBDatabase;
use crate::idb_key::idb_key::AutoIncrement;
use crate::idb_key::idb_key::IDBKeyNoAutoIncrement;
use crate::idb_object_store::ObjectStoreDefinition;
use crate::idb_object_store::{IDBObjectStore, JSIDBObjectStore};

#[cfg(not(target_arch = "wasm32"))]
unsafe fn create_object_store(
    _database: &Resource<JSIDBDatabase>,
    _name: u32,
    _auto_increment: bool,
) -> Resource<JSIDBObjectStore> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "idb_database")]
extern "C" {
    pub fn create_object_store(
        database: &Resource<JSIDBDatabase>,
        name: u32,
        auto_increment: bool,
    ) -> Resource<JSIDBObjectStore>;
}

pub struct IDBUpdateNeededDatabase {
    pub database: IDBDatabase,
}
impl IDBUpdateNeededDatabase {
    pub fn create_object_store<KeyType: IDBKeyNoAutoIncrement>(
        &self,
        objectstore_definition: &ObjectStoreDefinition<KeyType>,
    ) -> IDBObjectStore<KeyType, true, true> {
        IDBObjectStore {
            externref: unsafe {
                create_object_store(
                    self.database.externref.get().unwrap(),
                    objectstore_definition.to_number,
                    false,
                )
            },
            phantom: PhantomData,
        }
    }
    pub fn create_object_store_with_auto_increment(
        &self,
        objectstore_definition: &ObjectStoreDefinition<AutoIncrement>,
    ) -> IDBObjectStore<AutoIncrement, true, true> {
        IDBObjectStore {
            externref: unsafe {
                create_object_store(
                    &self.database.externref.get().unwrap(),
                    objectstore_definition.to_number,
                    true,
                )
            },
            phantom: PhantomData,
        }
    }
}
