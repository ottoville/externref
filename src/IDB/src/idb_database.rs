use crate::chararray::CharArray;
use crate::event::{Event, JSEVent};
use crate::idb_object_store::ObjectStoreTrait;
use crate::idb_transaction::IDBTransactionCbComplete;
use crate::idb_transaction::{IDBTransactionCbAbort, IDBTransactionCbError, JSIDBTransaction};
use crate::stringarray::JSStringArray;
use crate::{idb_result::IDBResult, idb_transaction::IDBTransaction};
use externref::externref;
use externref::Resource;
use web::primitives::jsstring::{JSString, JSStringExtern};
use std::cell::{Cell, OnceCell, RefCell};
use std::rc::Rc;

pub type IDBDatabaseCbErrorOrAbort = *mut *mut dyn Fn(Resource<JSStringExtern>);
pub type IDBDatabaseCbClose = *mut *mut dyn FnOnce();
pub type IDBDatabaseCbVersionChange = *mut *mut dyn FnOnce(Resource<JSEVent>);

#[no_mangle]
#[externref]
pub unsafe extern "C" fn idb_database_transaction_onerror_or_abort(
    callback: IDBDatabaseCbErrorOrAbort,
    error: Resource<JSStringExtern>,
) {
    (**callback)(error);
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn idb_database_onclose(callback: IDBDatabaseCbClose) {
    Box::from_raw(*Box::from_raw(callback))()
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn idb_database_version_change(
    callback: IDBDatabaseCbVersionChange,
    e: Resource<JSEVent>,
) {
    Box::from_raw(*Box::from_raw(callback))(e)
}

#[cfg(not(target_arch = "wasm32"))]
unsafe fn close(_database: &Resource<JSIDBDatabase>) {}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn on_error(_database: &Resource<JSIDBDatabase>, _cb: IDBDatabaseCbErrorOrAbort) {}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn on_abort(_database: &Resource<JSIDBDatabase>, _cb: IDBDatabaseCbErrorOrAbort) {}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn transaction(
    _database: &Resource<JSIDBDatabase>,
    _storageNames: &Resource<JSStringArray>,
    _write: bool,
    _strict: bool,
    _on_abort: IDBTransactionCbAbort,
    _on_error: IDBTransactionCbError,
    _on_complete: IDBTransactionCbComplete,
) -> Resource<JSIDBTransaction> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn on_version_change(_database: &Resource<JSIDBDatabase>, _cb: IDBDatabaseCbVersionChange) {}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn on_close(_database: &Resource<JSIDBDatabase>, _cb: IDBDatabaseCbClose) {}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "idb_database")]
extern "C" {
    pub fn close(database: &Resource<JSIDBDatabase>);
    pub fn on_error(database: &Resource<JSIDBDatabase>, cb: IDBDatabaseCbErrorOrAbort);
    pub fn on_abort(database: &Resource<JSIDBDatabase>, cb: IDBDatabaseCbErrorOrAbort);
    pub fn on_close(database: &Resource<JSIDBDatabase>, cb: IDBDatabaseCbClose);
    pub fn on_version_change(database: &Resource<JSIDBDatabase>, cb: IDBDatabaseCbVersionChange);
    pub fn transaction(
        database: &Resource<JSIDBDatabase>,
        storageNames: &Resource<JSStringArray>,
        write: bool,
        strict: bool,
        on_abort: IDBTransactionCbAbort,
        on_error: IDBTransactionCbError,
        on_complete: IDBTransactionCbComplete,
    ) -> Resource<JSIDBTransaction>;
}
pub struct JSIDBDatabase();
pub struct IDBDatabase {
    pub externref: OnceCell<Resource<JSIDBDatabase>>,
    pub cbs_version_change: Rc<RefCell<Vec<Box<dyn Fn(&Event)>>>>,
    pub cbs_transaction_error: Rc<RefCell<Vec<Box<dyn Fn(&JSString)>>>>,
    pub cbs_transaction_abort: Rc<RefCell<Vec<Box<dyn Fn(&Option<JSString>)>>>>,
    on_transaction_error: IDBDatabaseCbErrorOrAbort,
    on_transaction_abort: IDBDatabaseCbErrorOrAbort,
    on_version_change: IDBDatabaseCbVersionChange,
    on_database_close: IDBDatabaseCbClose,
    closed: Rc<Cell<bool>>,
}
impl IDBResult for IDBDatabase {
    type Externref = Resource<()>;
    type Output<'a> = &'a IDBDatabase;

    fn new() -> Self {
        Self::inner_new(OnceCell::new())
    }
    fn set_externref(&self, externref: Option<Self::Externref>) {
        let on_transaction_error = self.on_transaction_error.clone();
        let on_transaction_abort = self.on_transaction_abort.clone();
        let closed = self.closed.clone();
        let unwrapped = unsafe { externref.unwrap().downcast_unchecked() };
        unsafe {
            on_close(
                &unwrapped,
                Box::into_raw(Box::new(Box::into_raw(Box::new(move || {
                    if closed.get() {
                        return;
                    }
                    closed.set(true);
                    drop(Box::from_raw(*Box::from_raw(on_transaction_error)));
                    drop(Box::from_raw(*Box::from_raw(on_transaction_abort)));
                })))),
            )
        };
        let _ = self.externref.set(unwrapped);
    }

    fn output(&self) -> Self::Output<'_> {
        self
    }
}
impl IDBDatabase {
    fn inner_new(externref: OnceCell<Resource<JSIDBDatabase>>) -> Self {
        let cbs_transaction_error: Rc<RefCell<Vec<Box<dyn Fn(&JSString)>>>> =
            Rc::new(RefCell::new(Vec::new()));
        let cbs_transaction_abort: Rc<RefCell<Vec<Box<dyn Fn(&Option<JSString>)>>>> =
            Rc::new(RefCell::new(Vec::new()));
        let cbs_version_change: Rc<RefCell<Vec<Box<dyn Fn(&Event)>>>> =
            Rc::new(RefCell::new(Vec::new()));

        let cbs_transaction_error_clone = cbs_transaction_error.clone();
        let cbs_transaction_abort_clone = cbs_transaction_abort.clone();
        let cbs_version_change_clone = cbs_version_change.clone();
        let on_transaction_error: IDBDatabaseCbErrorOrAbort =
            Box::into_raw(Box::new(Box::into_raw(Box::new(move |new_error| {
                let error = JSString::new(new_error);
                for cb in cbs_transaction_error_clone.borrow_mut().iter() {
                    cb(&error)
                }
            }))));
        let on_transaction_abort: IDBDatabaseCbErrorOrAbort =
            Box::into_raw(Box::new(Box::into_raw(Box::new(move |new_error| {
                let error = JSString::new(new_error);
                let error2 = if error.len() > 0 { Some(error) } else { None };
                for cb in cbs_transaction_abort_clone.borrow_mut().iter() {
                    cb(&error2)
                }
            }))));
        let on_version_change: IDBDatabaseCbVersionChange =
            Box::into_raw(Box::new(Box::into_raw(Box::new(move |e| {
                let event = Event::from(e);
                for cb in cbs_version_change_clone.borrow_mut().iter() {
                    cb(&event)
                }
            }))));
        let closed: Rc<Cell<bool>> = Rc::new(Cell::new(false));
        let closed_clone = closed.clone();

        let on_database_close: IDBDatabaseCbClose =
            Box::into_raw(Box::new(Box::into_raw(Box::new(move || {
                if closed_clone.get() {
                    return;
                }
                closed_clone.set(true);
                /*
                   Clean other than close callback from memory
                */
                drop(unsafe { Box::from_raw(*Box::from_raw(on_transaction_error)) });
                drop(unsafe { Box::from_raw(*Box::from_raw(on_transaction_abort)) });
                drop(unsafe { Box::from_raw(*Box::from_raw(on_version_change)) });
            }))));
        IDBDatabase {
            externref,
            cbs_transaction_error,
            cbs_transaction_abort,
            cbs_version_change,
            on_transaction_error,
            on_transaction_abort,
            on_database_close,
            on_version_change,
            closed,
        }
    }
    pub fn transaction<const READ_WRITE: bool, const STRICT: bool, const N: usize>(
        &self,
        storenames: [&dyn ObjectStoreTrait; N],
    ) -> IDBTransaction<READ_WRITE> {
        let jsstorenames = CharArray::new(storenames[0].to_number());
        for n in 1..N {
            jsstorenames.push(storenames[n].to_number());
        }
        IDBTransaction::<READ_WRITE>::new::<STRICT>(
            self.externref.get().unwrap(),
            &jsstorenames.externref,
        )
    }
    pub fn on_version_change(&self, cb: impl Fn(&Event) + 'static) {
        let mut cbs_version_change = self.cbs_version_change.borrow_mut();
        if cbs_version_change.len() == 0 {
            unsafe { on_version_change(self.externref.get().unwrap(), self.on_version_change) };
        }
        cbs_version_change.push(Box::new(cb));
    }
    pub fn on_error(&self, cb: impl Fn(&JSString) + 'static) {
        let mut cbs_transaction_error = self.cbs_transaction_error.borrow_mut();
        if cbs_transaction_error.len() == 0 {
            unsafe { on_error(self.externref.get().unwrap(), self.on_transaction_error) };
        }
        cbs_transaction_error.push(Box::new(cb));
    }
    pub fn on_abort(&self, cb: impl Fn(&Option<JSString>) + 'static) {
        let mut cbs_transaction_abort = self.cbs_transaction_abort.borrow_mut();
        if cbs_transaction_abort.len() == 0 {
            unsafe { on_abort(self.externref.get().unwrap(), self.on_transaction_abort) };
        }
        cbs_transaction_abort.push(Box::new(cb));
    }
    pub fn close(&mut self) {
        if self.closed.get() {
            return;
        }
        self.closed.set(true);
        unsafe { close(&self.externref.get().unwrap()) };
        drop(unsafe { Box::from_raw(*Box::from_raw(self.on_transaction_error)) });
        drop(unsafe { Box::from_raw(*Box::from_raw(self.on_transaction_abort)) });
        drop(unsafe { Box::from_raw(*Box::from_raw(self.on_database_close)) });
        drop(unsafe { Box::from_raw(*Box::from_raw(self.on_version_change)) });
    }
}
impl Drop for IDBDatabase {
    fn drop(&mut self) {
        /*
         * When DB is dropped, clean the callbacks from memory.
         * We dont call close() here because that would broke the onupgradeneeded
         */
        if self.closed.get() {
            return;
        }
        drop(unsafe { Box::from_raw(*Box::from_raw(self.on_transaction_error)) });
        drop(unsafe { Box::from_raw(*Box::from_raw(self.on_transaction_abort)) });
        drop(unsafe { Box::from_raw(*Box::from_raw(self.on_database_close)) });
        drop(unsafe { Box::from_raw(*Box::from_raw(self.on_version_change)) });
    }
}
impl From<Resource<JSIDBDatabase>> for IDBDatabase {
    fn from(value: Resource<JSIDBDatabase>) -> Self {
        Self::inner_new(OnceCell::from(value))
    }
}
