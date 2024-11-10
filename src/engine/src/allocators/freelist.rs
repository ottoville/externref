use std::{
    mem::ManuallyDrop,
    ops::{Index, IndexMut},
    ptr,
};

// Guard for not referencing index with only type that was returned from allocator.
#[derive(Debug, Copy, Clone)]
#[repr(transparent)]
pub struct FreeListIndex(pub usize);

union Slot<T> {
    item: ManuallyDrop<T>,
    next_free: usize,
}
/**
 * Pooled free list allocation where each free slot contains pointer to next free slot
 */
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
impl<T> Drop for FreeList<T> {
    fn drop(&mut self) {
        let mut free_slots: Vec<usize> = Vec::with_capacity(self.used_space());
        let mut next_free_id = self.next_free;
        // Follow free slots path to list all free list
        let mut len = 0;
        while next_free_id < self.entries.len() {
            // Push to vector without bound capacity checking
            unsafe {
                let end = free_slots.as_mut_ptr().add(len);
                ptr::write(end, next_free_id);
                len += 1;
                next_free_id = self.entries.get_unchecked(next_free_id).next_free;
            }
        }
        unsafe {
            free_slots.set_len(len);
        }
        self.entries.iter_mut().enumerate().for_each(|(id, slot)| {
            if free_slots.contains(&id) {
                return;
            }
            unsafe {
                ManuallyDrop::drop(&mut slot.item);
            }
        });
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
static mut DROPPED: Vec<usize> = Vec::new();

#[cfg(test)]
pub struct TestEntry(pub usize);
#[cfg(test)]
impl Drop for TestEntry {
    fn drop(&mut self) {
        unsafe {
            DROPPED.push(self.0);
        }
    }
}

#[cfg(test)]
#[test]
fn test_freelist() {
    {
        let mut freelist: FreeList<TestEntry> = FreeList::new(2);
        let first = freelist.add(TestEntry(6)); // 6
        freelist.remove(first); // empty
        let first = freelist.add(TestEntry(0)); //0
        let second = freelist.add(TestEntry(1)); //0,1
        let second_idx = second.0;
        let third = freelist.add(TestEntry(2)); //0,1,2
        assert_eq!(freelist.used_space(), 3);
        freelist.remove(second); //0,empty,2
        assert_eq!(freelist.used_space(), 3);
        let forth = freelist.add(TestEntry(3)); //0,3,2
        assert_eq!(freelist.used_space(), 3);
        assert_eq!(second_idx, forth.0);
        let fifth = freelist.add(TestEntry(4)); //0,3,2,4
        assert_eq!(freelist.used_space(), 4);
        assert_eq!(freelist[first].0, 0);
        assert_eq!(freelist[third].0, 2);
        assert_eq!(freelist[forth].0, 3);
        assert_eq!(freelist[fifth].0, 4);
        freelist.remove(forth); //0,empty,2,4
        unsafe {
            DROPPED.clear();
        }
    }
    unsafe {
        assert_eq!(DROPPED[0], 0);
        assert_eq!(DROPPED[1], 2);
        assert_eq!(DROPPED[2], 4);
        assert_eq!(DROPPED.len(), 3);
    }
}
