use std::{mem::ManuallyDrop, ops::{Index, IndexMut}};

// Guard for not referencing index with only type that was returned from allocator.
#[derive(Debug, Copy, Clone)]
#[repr(transparent)]
pub struct FreeListIndex(pub usize);

union Slot<T> {
    item: ManuallyDrop<T>,
    next_free: usize,
}
pub struct FreeList<T> {
    entries: Vec<Slot<T>>,
    next_free: usize,
}
impl<T> FreeList<T> {
    pub fn new(capacity: usize) -> Self {
        FreeList {
            entries: Vec::with_capacity(capacity),
            next_free: 0,
        }
    }
    pub fn add(&mut self, value: T) -> FreeListIndex {
        let idx = self.next_free;
        if idx == self.entries.len() {
            self.next_free += 1;
            self.entries.push(Slot {
                item: ManuallyDrop::new(value),
            });
        } else {
            unsafe {
                let freeslot = self.entries.get_unchecked_mut(idx);
                self.next_free = freeslot.next_free;
                freeslot.item = ManuallyDrop::new(value);
            }
        }
        return FreeListIndex(idx);
    }
    pub fn remove(&mut self, idx: FreeListIndex) {
        unsafe {
            let slot = self.entries.get_unchecked_mut(idx.0);
            ManuallyDrop::drop(&mut slot.item);
            slot.next_free = self.next_free;
            self.next_free = idx.0;
        }
    }
    pub fn used_space(&self) -> usize {
        self.entries.len()
    }
}

impl<T> Index<FreeListIndex> for FreeList<T> {
    type Output = T;
    fn index(&self, index: FreeListIndex) -> &Self::Output {
        unsafe { &*self.entries[index.0].item }
    }
}
impl<T> IndexMut<FreeListIndex> for FreeList<T> {
    fn index_mut(&mut self, index: FreeListIndex) -> &mut Self::Output {
        unsafe { &mut *self.entries[index.0].item }
    }
}
#[cfg(test)]
#[test]
fn test_freelist() {
    let mut freelist: FreeList<[u32; 16]> = FreeList::new(2);
    let first = freelist.add([6; 16]);
    freelist.remove(first);
    let first = freelist.add([0; 16]);
    let second = freelist.add([1; 16]);
    let second_idx = second.0;
    let third = freelist.add([2; 16]);
    assert_eq!(freelist.used_space(), 3);
    freelist.remove(second);
    assert_eq!(freelist.used_space(), 3);
    let forth = freelist.add([3; 16]);
    assert_eq!(freelist.used_space(), 3);
    assert_eq!(second_idx, forth.0);
    let fifth = freelist.add([4; 16]);
    assert_eq!(freelist.used_space(), 4);

    assert_eq!(freelist[first], [0; 16]);
    assert_eq!(freelist[third], [2; 16]);
    assert_eq!(freelist[forth], [3; 16]);
    assert_eq!(freelist[fifth], [4; 16]);
}
