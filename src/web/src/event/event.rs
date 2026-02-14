use externref::Resource;

#[cfg(not(target_arch = "wasm32"))]
unsafe fn stop_propagation(_request: &Resource<JSEVent>) {}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn prevent_default(_request: &Resource<JSEVent>) {}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "event")]
extern "C" {
    pub fn prevent_default(request: &Resource<JSEVent>);
    pub fn stop_propagation(request: &Resource<JSEVent>);
}
pub struct JSEVent();
pub struct Event {
    pub externref: Resource<JSEVent>,
}
impl Event {
    pub fn new(externref: Resource<JSEVent>) -> Self {
        Event { externref }
    }
    pub fn prevent_default(&self) {
        unsafe { prevent_default(&self.externref) };
    }
    pub fn stop_propagation(&self) {
        unsafe { stop_propagation(&self.externref) };
    }
}
impl From<Resource<JSEVent>> for Event {
    fn from(value: Resource<JSEVent>) -> Self {
        Event { externref: value }
    }
}
