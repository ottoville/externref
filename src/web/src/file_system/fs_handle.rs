use crate::primitives::jsstring::JSString;

pub enum FSKind {
    File,
    Directory,
}
pub trait FSHandle {
    fn kind(&self) -> FSKind;
    fn name(&self) -> &JSString;
    /*fn is_same_entry(&self, other: &impl FSHandle) {
        todo!()
    }*/
}
