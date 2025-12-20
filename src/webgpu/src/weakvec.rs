use std::rc::{Rc, Weak};

pub struct WeakVec<T: ?Sized> {
    pub vec: Vec<Weak<T>>,
}
impl<T: ?Sized> WeakVec<T> {
    pub fn new() -> Self {
        WeakVec { vec: Vec::new() }
    }
    pub fn with_capacity(capacity: usize) -> Self {
        WeakVec {
            vec: Vec::with_capacity(capacity),
        }
    }
    pub fn iter<F: Fn(Rc<T>)>(&mut self, cb: F) {
        self.vec.retain_mut(|weak_item| {
            if let Some(item) = weak_item.upgrade() {
                cb(item);
                return true;
            }
            return false;
        });
    }
    pub fn iter_mut<F: FnMut(Rc<T>)>(&mut self, mut cb: F) {
        self.vec.retain_mut(|weak_item| {
            if let Some(item) = weak_item.upgrade() {
                cb(item);
                return true;
            }
            return false;
        });
    }
    pub fn push(&mut self, value: Weak<T>) {
        self.vec.push(value);
    }
}
