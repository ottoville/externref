use externref::Resource;

use crate::{
    event::event::Event,
    primitives::jsstring::{JSString, JSStringExtern},
};
pub type KeyBoardCb = *mut *mut dyn Fn(KeyboardEvent);
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn on_key_down(
    cb: KeyBoardCb,
    event: Resource<KeyboardEventExtern>,
    ctrl_key: bool,
    code: Resource<JSStringExtern>,
) {
    (**cb)(KeyboardEvent::new(event, ctrl_key, JSString::new(code)));
}
#[no_mangle]
#[externref::externref]
pub unsafe extern "C" fn on_key_up(
    cb: KeyBoardCb,
    event: Resource<KeyboardEventExtern>,
    ctrl_key: bool,
    code: Resource<JSStringExtern>,
) {
    (**cb)(KeyboardEvent::new(event, ctrl_key, JSString::new(code)));
}
pub struct KeyboardEvent {
    pub event: Event,
    pub ctrl_key: bool,
    pub code: JSString,
}
pub struct KeyboardEventExtern;
impl KeyboardEvent {
    pub fn new(externref: Resource<KeyboardEventExtern>, ctrl_key: bool, code: JSString) -> Self {
        KeyboardEvent {
            event: Event::new(unsafe { externref.upcast().downcast_unchecked() }),
            ctrl_key,
            code,
        }
    }
}
