use std::{
    cell::{OnceCell, RefCell},
    rc::Rc,
};

use externref::Resource;

use crate::{
    event::{Event, JSEVent},
    idb_result::IDBResult,
};

type IDBRequestCbError = *mut *mut dyn FnOnce(String, Event);
type IDBRequestCbSuccess = *mut *mut dyn FnOnce(Option<Resource<()>>, Event);
type IDBPutRequestCbSuccess = *mut *mut dyn FnOnce(Option<u32>, Event);

pub struct JSIDBRequest();
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn idb_request_onerror(
    callback: IDBRequestCbError,
    error_ptr: *mut u8,
    error_len: usize,
    error_cap: usize,
    event: Resource<JSEVent>,
) {
    Box::from_raw(*Box::from_raw(callback))(
        String::from_raw_parts(error_ptr, error_len, error_cap),
        Event { externref: event },
    );
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn idb_request_onsuccess(
    callback: IDBRequestCbSuccess,
    result: Resource<()>,
    event: Resource<JSEVent>,
) {
    Box::from_raw(*Box::from_raw(callback))(Some(result), Event { externref: event });
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn idb_request_onsuccess_put(
    callback: IDBPutRequestCbSuccess,
    result: u32,
    event: Resource<JSEVent>,
) {
    Box::from_raw(*Box::from_raw(callback))(Some(result), Event { externref: event });
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn idb_request_onsuccess_undefined_result(
    callback: IDBRequestCbSuccess,
    event: Resource<JSEVent>,
) {
    Box::from_raw(*Box::from_raw(callback))(None, Event { externref: event });
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn onerror(_request: &Resource<JSIDBRequest>, _cb: IDBRequestCbError) {}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn onsuccess(_request: &Resource<JSIDBRequest>, _cb: usize) {}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "idb_request")]
extern "C" {
    pub fn onerror(request: &Resource<JSIDBRequest>, cb: IDBRequestCbError);
    pub fn onsuccess(request: &Resource<JSIDBRequest>, cb: usize);
}
pub struct IDBRequest<T: IDBResult> {
    pub externref: Resource<JSIDBRequest>,
    pub result: Rc<T>,
    pub error: Rc<OnceCell<String>>,
    cbs_success: Rc<RefCell<Vec<Box<dyn FnOnce(&T::Output<'_>, Option<&Event>)>>>>,
    cbs_error: Rc<RefCell<Vec<Box<dyn FnOnce(&String, &Event)>>>>,
}
impl<T: IDBResult + 'static> IDBRequest<T> {
    pub fn new(externref: Resource<JSIDBRequest>) -> Self {
        let result = Rc::new(T::new());
        let error = Rc::new(OnceCell::new());
        let cbs_success = Rc::new(RefCell::new(Vec::new()));
        let cbs_error = Rc::new(RefCell::new(Vec::new()));
        let request = IDBRequest {
            externref,
            result: result.clone(),
            error: error.clone(),
            cbs_success: cbs_success.clone(),
            cbs_error: cbs_error.clone(),
        };
        let cbs_success_clone: Rc<
            RefCell<Vec<Box<dyn FnOnce(&<T as IDBResult>::Output<'_>, Option<&Event>) + 'static>>>,
        > = cbs_success.clone();
        let success_cb: *mut *mut dyn FnOnce(Option<T::Externref>, Event) = Box::into_raw(
            Box::new(Box::into_raw(Box::new(move |new_result, event| {
                result.set_externref(new_result);
                let output = result.output();
                for cb in cbs_success_clone.borrow_mut().drain(..) {
                    cb(&output, Some(&event))
                }
            }))),
        );
        let error_cb: IDBRequestCbError = Box::into_raw(Box::new(Box::into_raw(Box::new(
            move |new_error, event| {
                _ = error.set(new_error);
                let unwrapped_error = error.get().unwrap();
                for cb in cbs_error.borrow_mut().drain(..) {
                    cb(unwrapped_error, &event)
                }
                // Drop on_success callback as it was newer consumed
                drop(unsafe { Box::from_raw(*Box::from_raw(success_cb)) });
            },
        ))));
        cbs_success.borrow_mut().push(Box::new(move |_, _| {
            // Drop on_error callback as it was newer consumed
            drop(unsafe { Box::from_raw(*Box::from_raw(error_cb)) });
        }));

        unsafe {
            onsuccess(&request.externref, success_cb as usize);
            onerror(&request.externref, error_cb)
        }
        return request;
    }
    pub fn on_success(&self, cb: impl FnOnce(&T::Output<'_>, Option<&Event>) + 'static) {
        self.cbs_success.borrow_mut().push(Box::new(cb));
    }
    pub fn on_error(&self, cb: impl FnOnce(&String, &Event) + 'static) {
        self.cbs_error.borrow_mut().push(Box::new(cb));
    }
}
