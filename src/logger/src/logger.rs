#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn log_str(_prt: usize, _len: usize) {}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn log_usize(_number: usize) {}
#[link(wasm_import_module = "console")]
#[cfg(target_arch = "wasm32")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn log_str(prt: usize, len: usize);
    fn log_usize(number: usize);
}
pub trait Logger {
    fn log(&self);
}

impl Logger for String {
    fn log(&self) {
        unsafe {
            log_str(self.as_ptr() as usize, self.len());
        }
    }
}
impl Logger for usize {
    fn log(&self) {
        unsafe {
            log_usize(*self);
        }
    }
}
impl Logger for [&str] {
    fn log(&self) {
        let mut log_string = String::new();
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(str);
        }
        log_string.log();    }
}
impl Logger for Vec<u32> {
    fn log(&self) {
        let mut log_string = String::new();
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(&str.to_string());
        }
        log_string.log();
    }
}
impl Logger for Vec<usize> {
    fn log(&self) {
        let mut log_string = String::new();
        for str in self.iter() {
            log_string.push(' ');
            log_string.push_str(&str.to_string());
        }
        log_string.log();
    }
}
impl Logger for [f32; 3] {
    fn log(&self) {
        let mut log_string = String::new();
        log_string.push_str(&self[0].to_string());
        log_string.push(',');
        log_string.push_str(&self[1].to_string());
        log_string.push(',');
        log_string.push_str(&self[2].to_string());
        log_string.log();
    }
}
impl Logger for [[f32; 4]; 4] {
    fn log(&self) {
        let mut log_string = String::new();
        for i in 0..4 {
            for ii in 0..4 {
                log_string.push_str(&self[i][ii].to_string());
                log_string.push(' ');
            }
        }
        log_string.log();
    }
}
