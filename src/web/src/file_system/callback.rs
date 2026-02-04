use crate::primitives::jsstring::JSString;

type CallbackOnce<T> = *mut *mut dyn FnOnce(Result<T, JSString>);
pub fn create_cb_box<T>(cb: impl FnOnce(Result<T, JSString>) + 'static) -> CallbackOnce<T> {
    Box::into_raw(Box::new(Box::into_raw(Box::new(|resource| cb(resource)))))
}
