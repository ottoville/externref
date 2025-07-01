use externref::Resource;

pub trait HaveExternref<T> {
    fn externref(&self) -> &Resource<T>;
}