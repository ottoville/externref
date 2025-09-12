use externref::Resource;
pub struct JSGPUBindGroupLayoutEntry();

pub trait BindingLayout {
    fn externref(&self) -> &Resource<JSGPUBindGroupLayoutEntry>;
}