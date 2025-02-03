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
pub trait Logger: LoggerString {
    fn log(&self) {
        let s = self.to_string();
        unsafe { log_str(s.as_ptr() as usize, s.len()) };
    }
    fn warn(&self) {
        let s = self.to_string();
        unsafe { warn_str(s.as_ptr() as usize, s.len()) };
    }
    fn error(&self) {
        let s = self.to_string();
        unsafe { error_str(s.as_ptr() as usize, s.len()) };
    }
}
pub trait LoggerString {
    fn to_string(&self) -> String;
}
impl LoggerString for [&str] {
    fn to_string(&self) -> String {
        let mut log_string = String::new();
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(str);
        }
        return log_string;
    }
}
impl LoggerString for [String] {
    fn to_string(&self) -> String {
        let mut log_string = String::new();
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(str);
        }
        return log_string;
    }
}
impl LoggerString for Vec<u32> {
    fn to_string(&self) -> String {
        let mut log_string = String::new();
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(&str.to_string());
        }
        return log_string;
    }
}
impl LoggerString for Vec<usize> {
    fn to_string(&self) -> String {
        let mut log_string = String::new();
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(&str.to_string());
        }
        return log_string;
    }
}
impl LoggerString for [f32] {
    fn to_string(&self) -> String {
        let mut log_string = String::new();
        for i in 0..self.len() {
            log_string.push_str(&self[i].to_string());
            log_string.push_str(", ");
    
        }
        return log_string;
    }
}
impl LoggerString for [[f32; 4]; 4] {
    fn to_string(&self) -> String {
        let mut log_string = String::new();
        for i in 0..4 {
            for ii in 0..4 {
                log_string.push_str(&self[i][ii].to_string());
                log_string.push(' ');
            }
        }
        return log_string;
    }
}
impl LoggerString for String {
    fn to_string(&self) -> String {
        return self.clone();
    }
}
impl LoggerString for &str {
    fn to_string(&self) -> String {
        return ToString::to_string(&self)
    }
}
impl Logger for &str {}
impl Logger for String {}
impl Logger for [&str] {}
impl Logger for [String] {}
impl Logger for Vec<u32> {}
impl Logger for Vec<usize> {}
impl Logger for [f32] {}
impl Logger for [[f32; 4]; 4] {}
