use std::{
    mem,
    ops::{Index, IndexMut},
};

// Guard for not referencing index with only type that was returned from allocator.
#[derive(Debug, Copy, Clone)]
#[repr(transparent)]
pub struct ExplicitFreeListIndex(pub usize);

enum Slot<T> {
    Item(T),
    /**
     * Next free slot
     */
    NextFree(usize),
}
/**
* Pooled free list allocation where each free slot contains pointer to next free slot
 and each slot itself contains information whetever it is occupied to allow
 fast iteration
*/
pub struct ExplicitFreeList<T> {
    entries: Vec<Slot<T>>,
    next_free: usize,
}
impl<T> ExplicitFreeList<T> {
    pub fn new(capacity: usize) -> Self {
        ExplicitFreeList {
            entries: Vec::with_capacity(capacity),
            next_free: 0,
        }
    }
    pub fn insert(&mut self, value: T) -> ExplicitFreeListIndex {
        let idx = self.next_free;
        if idx == self.entries.len() {
            self.next_free += 1;
            self.entries.push(Slot::Item(value))
        } else {
            unsafe {
                let freeslot = self.entries.get_unchecked_mut(idx);
                match freeslot {
                    Slot::Item(_) => {
                        std::hint::unreachable_unchecked();
                    }
                    Slot::NextFree(next_free) => {
                        self.next_free = *next_free;
                        mem::swap(freeslot, &mut Slot::Item(value));
                    }
                }
            }
        }
        return ExplicitFreeListIndex(idx);
    }
    pub fn remove(&mut self, idx: ExplicitFreeListIndex) {
        self.entries[idx.0] = Slot::NextFree(self.next_free);
        self.next_free = idx.0;
    }
    pub fn used_space(&self) -> usize {
        self.entries.len()
    }
    pub fn iter(&self) -> impl Iterator<Item = &T> {
        self.entries.iter().filter_map(|slot| {
            if let Slot::Item(item) = slot {
                return Some(item);
            }
            return None;
        })
    }
    pub fn drain(&mut self) -> impl Iterator<Item = T> + '_ {
        self.next_free = 0;
        self.entries.drain(..).filter_map(|slot| {
            if let Slot::Item(item) = slot {
                return Some(item);
            }
            return None;
        })
    }
}
impl<T> Index<ExplicitFreeListIndex> for ExplicitFreeList<T> {
    type Output = T;
    fn index(&self, index: ExplicitFreeListIndex) -> &Self::Output {
        unsafe {
            match &self.entries.get_unchecked(index.0) {
                Slot::Item(item) => item,
                Slot::NextFree(_) => {
                    std::hint::unreachable_unchecked();
                }
            }
        }
    }
}
impl<T> IndexMut<ExplicitFreeListIndex> for ExplicitFreeList<T> {
    fn index_mut(&mut self, index: ExplicitFreeListIndex) -> &mut Self::Output {
        unsafe {
            match self.entries.get_unchecked_mut(index.0) {
                Slot::Item(item) => item,
                Slot::NextFree(_) => {
                    std::hint::unreachable_unchecked();
                }
            }
        }
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
fn test_explicit_freelist() {
    {
        let mut freelist: ExplicitFreeList<TestEntry> = ExplicitFreeList::new(2);
        let first_6 = freelist.insert(TestEntry(6)); // 6
        freelist.remove(first_6); // empty
        let first_0 = freelist.insert(TestEntry(0)); //0
        let second_1 = freelist.insert(TestEntry(1)); //0,1
        let second_idx = second_1.0;
        let third_2 = freelist.insert(TestEntry(2)); //0,1,2
        assert_eq!(freelist.used_space(), 3);
        freelist.remove(second_1); //0,empty,2
        assert_eq!(freelist.used_space(), 3);
        let forth_3 = freelist.insert(TestEntry(3)); //0,3,2
        assert_eq!(freelist.used_space(), 3);
        assert_eq!(second_idx, forth_3.0);
        let fifth_4 = freelist.insert(TestEntry(4)); //0,3,2,4
        assert_eq!(freelist.used_space(), 4);
        assert_eq!(freelist[first_0].0, 0);
        assert_eq!(freelist[third_2].0, 2);
        assert_eq!(freelist[forth_3].0, 3);
        assert_eq!(freelist[fifth_4].0, 4);
        freelist.remove(forth_3); //0,empty,2,4

        let mut items = freelist.iter();
        assert_eq!(items.next().unwrap().0, freelist[first_0].0);
        assert_eq!(items.next().unwrap().0, freelist[third_2].0);
        assert_eq!(items.next().unwrap().0, freelist[fifth_4].0);
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
