use crate::{
    idb_database::transaction, idb_key::idb_key::IDBKey, idb_object_store::ObjectStoreDefinition,
    stringarray::JSStringArray,
};
use web::event::event::Event;

use externref::externref;
use externref::Resource;
use std::mem::MaybeUninit;
use std::{
    cell::{OnceCell, RefCell},
    marker::PhantomData,
    rc::Rc,
};
use web::event::event::JSEVent;
use web::primitives::jsstring::JSString;
use web::primitives::jsstring::JSStringExtern;

use crate::{
    idb_database::JSIDBDatabase,
    idb_object_store::{IDBObjectStore, JSIDBObjectStore},
};

#[no_mangle]
#[externref]
pub unsafe extern "C" fn idb_transaction_on_error(
    callback: IDBTransactionCbError,
    error: Resource<JSStringExtern>,
    event: Resource<JSEVent>,
) {
    (&*(*callback).assume_init())(JSString::new(error), Event { externref: event });
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn idb_transaction_on_abort(
    callback: IDBTransactionCbAbort,
    error: Resource<JSStringExtern>,
    event: Resource<JSEVent>,
) {
    Box::from_raw((*Box::from_raw(callback)).assume_init())(
        JSString::new(error),
        Event { externref: event },
    );
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn idb_transaction_on_complete(
    callback: IDBTransactionCbComplete,
    event: Resource<JSEVent>,
) {
    Box::from_raw(*Box::from_raw(callback))(Event { externref: event });
}

#[cfg(not(target_arch = "wasm32"))]
unsafe fn object_store(
    _transaction: &Resource<JSIDBTransaction>,
    _objectstore: u32,
) -> Resource<JSIDBObjectStore> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "idb_transaction")]
extern "C" {
    pub fn object_store(
        transaction: &Resource<JSIDBTransaction>,
        objectstore: u32,
    ) -> Resource<JSIDBObjectStore>;
}

pub type IDBTransactionCbError = *mut MaybeUninit<*mut dyn Fn(JSString, Event)>;
pub type IDBTransactionCbAbort = *mut MaybeUninit<*mut dyn FnOnce(JSString, Event)>;
pub type IDBTransactionCbComplete = *mut *mut dyn FnOnce(Event);

pub struct JSIDBTransaction();
pub struct IDBTransaction<const READ_WRITE: bool> {
    pub externref: Resource<JSIDBTransaction>,
    pub error: Rc<OnceCell<JSString>>,
    cbs_abort: Rc<RefCell<Vec<Box<dyn FnOnce(&JSString, &Event)>>>>,
    cbs_error: Rc<RefCell<Vec<Box<dyn Fn(&JSString, &Event)>>>>,
    cbs_complete: Rc<RefCell<Vec<Box<dyn FnOnce(&Event)>>>>,
}
impl<const READ_WRITE: bool> IDBTransaction<READ_WRITE> {
    pub fn clean_cbs(
        &self,
        on_error: IDBTransactionCbError,
        on_abort: IDBTransactionCbAbort,
        on_complete: IDBTransactionCbComplete,
    ) {
        drop(unsafe { Box::from_raw((*Box::from_raw(on_error)).assume_init()) });
        if self.error.get().is_none() {
            drop(unsafe { Box::from_raw((*Box::from_raw(on_abort)).assume_init()) });
        } else {
            drop(unsafe { Box::from_raw(*Box::from_raw(on_complete)) })
        }
    }
    pub fn new<const STRICT: bool>(
        database: &Resource<JSIDBDatabase>,
        stores: &Resource<JSStringArray>,
    ) -> Self {
        let error = Rc::new(OnceCell::new());
        let cbs_abort: Rc<RefCell<Vec<Box<dyn FnOnce(&JSString, &Event) + 'static>>>> =
            Rc::new(RefCell::new(Vec::new()));
        let cbs_error: Rc<RefCell<Vec<Box<dyn Fn(&JSString, &Event) + 'static>>>> =
            Rc::new(RefCell::new(Vec::new()));
        let cbs_complete: Rc<RefCell<Vec<Box<dyn FnOnce(&Event) + 'static>>>> =
            Rc::new(RefCell::new(Vec::new()));
        let cbs_abort_clone = cbs_abort.clone();
        let cbs_error_clone = cbs_error.clone();
        let cbs_complete_clone = cbs_complete.clone();
        let error_clone = error.clone();
        let on_error: *mut MaybeUninit<*mut (dyn Fn(JSString, Event) + 'static)> =
            Box::into_raw(Box::new_uninit());
        let on_abort: *mut MaybeUninit<*mut (dyn FnOnce(JSString, Event) + 'static)> =
            Box::into_raw(Box::new_uninit());
        let on_complete: IDBTransactionCbComplete =
            Box::into_raw(Box::new(Box::into_raw(Box::new(move |event| {
                for cb in cbs_complete.borrow_mut().drain(..) {
                    cb(&event)
                } // Transaction has never been aborted so callback "idb_transaction_on_abort" has not run to free the memory
                drop(unsafe { Box::from_raw((*Box::from_raw(on_abort)).assume_init()) });
                drop(unsafe { Box::from_raw((*Box::from_raw(on_error)).assume_init()) });
            }))));
        unsafe {
            (*on_error).write(Box::into_raw(Box::new(move |new_error, event| {
                for cb in cbs_error.borrow_mut().iter() {
                    cb(&new_error, &event)
                }
            })));
            (*on_abort).write(Box::into_raw(Box::new(move |abort_error, event| {
                for cb in cbs_abort.borrow_mut().drain(..) {
                    cb(&abort_error, &event)
                }
                _ = error.set(abort_error);
                // Transaction has never been complete so callback "idb_transaction_on_complete" has not run to free the memory
                drop(Box::from_raw(*Box::from_raw(on_complete)));
                drop(Box::from_raw((*Box::from_raw(on_error)).assume_init()));
            })));
        }
        IDBTransaction {
            externref: unsafe {
                transaction(
                    database,
                    stores,
                    READ_WRITE,
                    STRICT,
                    on_abort,
                    on_error,
                    on_complete,
                )
            },
            cbs_abort: cbs_abort_clone,
            cbs_error: cbs_error_clone,
            cbs_complete: cbs_complete_clone,
            error: error_clone,
        }
    }
    pub fn object_store<T: IDBKey>(
        &self,
        objectstore: &ObjectStoreDefinition<T>,
    ) -> IDBObjectStore<T, false, READ_WRITE> {
        IDBObjectStore {
            externref: unsafe { object_store(&self.externref, objectstore.to_number) },
            phantom: PhantomData,
        }
    }
    pub fn on_error(&self, cb: impl Fn(&JSString, &Event) + 'static) {
        self.cbs_error.borrow_mut().push(Box::new(cb));
    }
    pub fn on_abort(&self, cb: impl FnOnce(&JSString, &Event) + 'static) {
        self.cbs_abort.borrow_mut().push(Box::new(cb));
    }
    pub fn on_complete(&self, cb: impl FnOnce(&Event) + 'static) {
        self.cbs_complete.borrow_mut().push(Box::new(cb));
    }
}
