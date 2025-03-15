use std::cell::RefCell;

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn log_str(_prt: usize, _len: usize) {}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn error_str(_prt: usize, _len: usize) {}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn warn_str(_prt: usize, _len: usize) {}

#[link(wasm_import_module = "console")]
#[cfg(target_arch = "wasm32")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn error_str(prt: usize, len: usize);
    fn log_str(prt: usize, len: usize);
    fn warn_str(prt: usize, len: usize);
}
pub trait LoggerArray: LoggerString {
    fn log(&self) {
        LOG_STRING.with_borrow_mut(|log_string| {
            log_string.clear();
            self.make_string(log_string);
            unsafe { log_str(log_string.as_ptr() as usize, log_string.len()) };
        })
    }
    fn warn(&self) {
        LOG_STRING.with_borrow_mut(|log_string| {
            log_string.clear();
            self.make_string(log_string);
            unsafe { warn_str(log_string.as_ptr() as usize, log_string.len()) };
        })
    }
    fn error(&self) {
        LOG_STRING.with_borrow_mut(|log_string| {
            log_string.clear();
            self.make_string(log_string);
            unsafe { error_str(log_string.as_ptr() as usize, log_string.len()) };
        })
    }
}
pub trait Logger {
    fn log(&self);
    fn warn(&self);
    fn error(&self);
}
thread_local! {
    static LOG_STRING:RefCell<String> = const { RefCell::new(String::new()) };
}
pub trait LoggerString {
    fn make_string(&self, log_string: &mut String);
}
impl LoggerString for [&str] {
    fn make_string(&self, log_string: &mut String) {
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(str);
        }
    }
}
impl LoggerString for [String] {
    fn make_string(&self, log_string: &mut String) {
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(str);
        }
    }
}
impl LoggerString for Vec<u32> {
    fn make_string(&self, log_string: &mut String) {
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(&str.to_string());
        }
    }
}
impl LoggerString for Vec<usize> {
    fn make_string(&self, log_string: &mut String) {
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(&str.to_string());
        }
    }
}
impl LoggerString for [f32] {
    fn make_string(&self, log_string: &mut String) {
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(&str.to_string());
        }
    }
}
impl LoggerString for [i32] {
    fn make_string(&self, log_string: &mut String) {
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(&str.to_string());
        }
    }
}
impl LoggerString for [usize] {
    fn make_string(&self, log_string: &mut String) {
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(&str.to_string());
        }
    }
}
impl LoggerString for [[f32; 4]; 4] {
    fn make_string(&self, log_string: &mut String) {
        for i in 0..4 {
            for ii in 0..4 {
                log_string.push_str(&self[i][ii].to_string());
                log_string.push(' ');
            }
        }
    }
}
impl Logger for str {
    fn log(&self) {
        unsafe { log_str(self.as_ptr() as usize, self.len()) };
    }
    fn warn(&self) {
        unsafe { warn_str(self.as_ptr() as usize, self.len()) };
    }
    fn error(&self) {
        unsafe { error_str(self.as_ptr() as usize, self.len()) };
    }
}
impl LoggerArray for [&str] {}
impl LoggerArray for [String] {}
impl LoggerArray for Vec<u32> {}
impl LoggerArray for Vec<usize> {}
impl LoggerArray for [f32] {}
impl LoggerArray for [i32] {}
impl LoggerArray for [usize] {}
impl LoggerArray for [[f32; 4]; 4] {}
