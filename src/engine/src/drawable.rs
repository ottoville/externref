use wasm_bindgen::prelude::*;

pub trait Drawable {
    fn draw(&self, render_pass: &JsValue);
}