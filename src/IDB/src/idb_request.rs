use std::{cell::OnceCell, marker::PhantomData, mem::MaybeUninit, rc::Rc};

use externref::Resource;
use web::event::event::{Event, JSEVent};
use web::primitives::jsstring::{JSString, JSStringExtern};

use crate::idb_result::IDBResult;

type IDBRequestCbError = *mut MaybeUninit<*mut dyn FnOnce(JSString, Event)>;
type IDBRequestCbSuccess = *mut *mut dyn FnOnce(Option<Resource<()>>, Event);
type IDBPutRequestCbSuccess = *mut *mut dyn FnOnce(Option<u32>, Event);

pub struct JSIDBRequest();
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn idb_request_onerror(
    callback: IDBRequestCbError,
    error: Resource<JSStringExtern>,
    event: Resource<JSEVent>,
) {
    Box::from_raw((*Box::from_raw(callback)).assume_init())(
        JSString::new(error),
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
    pub error: Rc<OnceCell<JSString>>,
    phantom: PhantomData<T>,
}
impl<T: IDBResult + 'static> IDBRequest<T> {
    pub fn new(
        externref: Resource<JSIDBRequest>,
        cb: impl FnOnce(Result<T::Output, (&JSString, &Event)>) + 'static,
    ) -> Self {
        let result = T::new();
        let error = Rc::new(OnceCell::new());
        let cb_rc = Rc::new(cb);
        let cb_rc_clone = cb_rc.clone();
        let request = IDBRequest {
            externref,
            error: error.clone(),
            phantom: PhantomData,
        };
        let error_cb: *mut MaybeUninit<*mut (dyn FnOnce(JSString, Event) + 'static)> =
            Box::into_raw(Box::new_uninit());
        let success_cb: *mut *mut dyn FnOnce(Option<T::Externref>, Event) = Box::into_raw(
            Box::new(Box::into_raw(Box::new(move |new_result, event| {
                result.set_externref(new_result);
                let output = result.output();
                // Drop on_error callback as it was newer consumed
                drop(unsafe { Box::from_raw(*Box::from_raw(error_cb).assume_init()) });
                Rc::into_inner(cb_rc).unwrap()(Result::Ok(output));
            }))),
        );
        //
        unsafe {
            (*error_cb).write(Box::into_raw(Box::new(move |new_error, event| {
                _ = error.set(new_error);
                let unwrapped_error = error.get().unwrap();
                // Drop on_success callback as it was newer consumed
                drop(Box::from_raw(*Box::from_raw(success_cb)));
                Rc::into_inner(cb_rc_clone).unwrap()(Result::Err((unwrapped_error, &event)));
            })));
        }

        unsafe {
            onsuccess(&request.externref, success_cb as usize);
            onerror(&request.externref, error_cb)
        }
        return request;
    }
}
