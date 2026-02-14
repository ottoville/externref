pub trait IDBResult {
    type Externref;
    type Output;
    fn new() -> Self;
    fn set_externref(&self, externref: Option<Self::Externref>);
    fn output(self) -> Self::Output;
}
