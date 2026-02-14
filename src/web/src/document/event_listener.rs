use std::sync::atomic::{AtomicU32, Ordering};

use crate::event::keyboard_event::KeyBoardCb;

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn add_keydown_event_listener(_cb: KeyBoardCb) {}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn add_keyup_event_listener(_cb: KeyBoardCb) {}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "keyboard_events")]
extern "C" {
    pub fn add_keydown_event_listener(cb: KeyBoardCb);
    pub fn add_keyup_event_listener(cb: KeyBoardCb);
}
pub const ARROW_KEYS_UP: u32 = 1;
pub const ARROW_KEYS_RIGHT: u32 = 2;
pub const ARROW_KEYS_DOWN: u32 = 4;
pub const ARROW_KEYS_LEFT: u32 = 8;
pub const PAGEUP: u32 = 16;
pub const PAGEDOWN: u32 = 32;
pub const CTRL_LEFT: u32 = 64;
pub const CTRL_RIGHT: u32 = 128;
pub const ARROW_KEYS_UP_OR_DOWN: u32 = ARROW_KEYS_UP | ARROW_KEYS_DOWN;
pub const SOME_ARROW_KEY: u32 =
    ARROW_KEYS_UP | ARROW_KEYS_DOWN | ARROW_KEYS_LEFT | ARROW_KEYS_RIGHT;
pub const CTRL: u32 = CTRL_LEFT | CTRL_RIGHT;

pub static PREVIOUS_KEYSDOWN: AtomicU32 = AtomicU32::new(0);
pub static KEYSDOWN: AtomicU32 = AtomicU32::new(0);
pub struct EventListener {}
impl EventListener {
    pub fn new() {
        unsafe {
            add_keydown_event_listener(Box::into_raw(Box::new(Box::into_raw(Box::new(|evt| {
                let code: String = evt.code.into();
                PREVIOUS_KEYSDOWN.store(
                    match code.as_str() {
                        "ArrowUp" => KEYSDOWN.fetch_or(ARROW_KEYS_UP, Ordering::Relaxed),
                        "ArrowDown" => KEYSDOWN.fetch_or(ARROW_KEYS_DOWN, Ordering::Relaxed),
                        "ArrowLeft" => KEYSDOWN.fetch_or(ARROW_KEYS_LEFT, Ordering::Relaxed),
                        "ArrowRight" => KEYSDOWN.fetch_or(ARROW_KEYS_RIGHT, Ordering::Relaxed),
                        "PageUp" => KEYSDOWN.fetch_or(PAGEUP, Ordering::Relaxed),
                        "PageDown" => KEYSDOWN.fetch_or(PAGEDOWN, Ordering::Relaxed),
                        "ControlLeft" => KEYSDOWN.fetch_or(CTRL_LEFT, Ordering::Relaxed),
                        "ControlRight" => KEYSDOWN.fetch_or(CTRL_RIGHT, Ordering::Relaxed),
                        _ => KEYSDOWN.load(Ordering::Relaxed),
                    },
                    Ordering::Relaxed,
                )
            })))));
        }
        unsafe {
            add_keyup_event_listener(Box::into_raw(Box::new(Box::into_raw(Box::new(|evt| {
                let code: String = evt.code.into();
                PREVIOUS_KEYSDOWN.store(
                    match code.as_str() {
                        "ArrowUp" => KEYSDOWN.fetch_and(!ARROW_KEYS_UP, Ordering::Relaxed),
                        "ArrowDown" => KEYSDOWN.fetch_and(!ARROW_KEYS_DOWN, Ordering::Relaxed),
                        "ArrowLeft" => KEYSDOWN.fetch_and(!ARROW_KEYS_LEFT, Ordering::Relaxed),
                        "ArrowRight" => KEYSDOWN.fetch_and(!ARROW_KEYS_RIGHT, Ordering::Relaxed),
                        "PageUp" => KEYSDOWN.fetch_and(!PAGEUP, Ordering::Relaxed),
                        "PageDown" => KEYSDOWN.fetch_and(!PAGEDOWN, Ordering::Relaxed),
                        "ControlLeft" => KEYSDOWN.fetch_and(!CTRL_LEFT, Ordering::Relaxed),
                        "ControlRight" => KEYSDOWN.fetch_and(!CTRL_RIGHT, Ordering::Relaxed),
                        _ => KEYSDOWN.load(Ordering::Relaxed),
                    },
                    Ordering::Relaxed,
                )
            })))));
        }
    }
}
