use crate::{idb_key::idb_key::IDBReturnKeyOutput, idb_result::IDBResult};
use std::cell::OnceCell;

pub struct IDBValidKey<KeyType: IDBReturnKeyOutput> {
    key: OnceCell<KeyType::OutputType>,
}
impl<KeyType: IDBReturnKeyOutput> IDBResult for IDBValidKey<KeyType> {
    type Externref = KeyType::InputType;
    type Output<'a>
        = &'a KeyType::OutputType
    where
        KeyType: 'a;
    fn new() -> Self {
        Self {
            key: OnceCell::new(),
        }
    }

    fn set_externref(&self, externref: Option<Self::Externref>) {
        let newkey = KeyType::key_from_externref(externref.unwrap());
        _ = self.key.set(newkey);
    }
    fn output(&self) -> Self::Output<'_> {
        self.key.get().unwrap()
    }
}
