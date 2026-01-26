use std::marker::PhantomData;

use IDB::{idb_key::idb_key::AutoIncrement, idb_object_store::ObjectStoreDefinition};

pub static SAVE_STORE: ObjectStoreDefinition<&[String; 2]> = ObjectStoreDefinition {
    to_number: 2,
    keypath: PhantomData,
};

pub static PLANTAE_STORE: ObjectStoreDefinition<AutoIncrement> = ObjectStoreDefinition {
    to_number: 1,
    keypath: PhantomData,
};
pub static ZONES_STORE: ObjectStoreDefinition<AutoIncrement> = ObjectStoreDefinition {
    to_number: 3,
    keypath: PhantomData,
};
