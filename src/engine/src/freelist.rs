use std::{
    mem::ManuallyDrop,
    num::NonZeroUsize,
    ops::{Deref, Index, IndexMut},
};

pub type Idx = NonZeroUsize;

union Slot<T> {
    data: ManuallyDrop<T>,
    next_free: Option<Idx>,
}

pub struct FreeList<T> {
    entries: Vec<Slot<T>>,
    next_free: Option<Idx>,
    used_slot_two: bool,
}

impl<T> Default for FreeList<T> {
    fn default() -> Self {
        Self::new()
    }
}

impl<T> Drop for FreeList<T> {
    fn drop(&mut self) {
        let raw = self.entries.as_mut_ptr();
        let start = if self.used_slot_two { 1 } else { 2 };
        unsafe {
            std::ptr::drop_in_place(std::ptr::slice_from_raw_parts_mut(
                raw.add(start),
                self.entries.len() - start,
            ));
            self.entries.set_len(0);
        }
    }
}

impl<T> FreeList<T> {
    pub fn new() -> Self {
        Self {
            entries: vec![
                /* push a dummy thing to idx zero so we can use NonZeroUsize */
                Slot { next_free: None },
                /* push a empty slot to use as first entry */
                Slot { next_free: None },
            ],
            next_free: Some(unsafe { Idx::new_unchecked(1) }),
            used_slot_two: false,
        }
    }

    pub fn add(&mut self, data: T) -> Idx {
        match self.next_free {
            None => {
                let idx = self.entries.len();
                self.entries.push(Slot {
                    data: ManuallyDrop::new(data),
                });
                unsafe { Idx::new_unchecked(idx) }
            }
            Some(idx) => {
                self.next_free = unsafe { self.entries[idx.get()].next_free.take() };

                let mut old = unsafe {
                    std::mem::replace(&mut self.entries[idx.get()].data, ManuallyDrop::new(data))
                };

                if (idx.get() == 1) && !self.used_slot_two {
                    self.used_slot_two = true;
                } else {
                    unsafe { ManuallyDrop::drop(&mut old) }
                }
                idx
            }
        }
    }

    pub fn remove(&mut self, idx: Idx) {
        self.entries[idx.get()].next_free = self.next_free;
        self.next_free = Some(idx);
    }

    pub fn remove_replace(&mut self, idx: Idx, sentinel: T) {
        self.entries[idx.get()].next_free = self.next_free;
        unsafe {
            ManuallyDrop::drop(&mut std::mem::replace(
                &mut self.entries[idx.get()].data,
                ManuallyDrop::new(sentinel),
            ));
        }
        self.next_free = Some(idx);
    }

    // potentially accesses data already removed
    pub unsafe fn find(&self, predicate: impl FnMut(&&T) -> bool) -> Option<&T> {
        self.entries
            .iter()
            .skip(if self.used_slot_two { 1 } else { 2 })
            .map(|v| &*v.data)
            .find(predicate)
    }

    // this only works until you push new items
    pub unsafe fn removed(&mut self, idx: Idx) -> bool {
        self.entries[idx.get()].next_free.is_some() || self.next_free == Some(idx)
    }

    // make sure to only touch elements one and above
    pub unsafe fn iter_raw(&self) -> impl Iterator<Item = &T> {
        self.entries.iter().map(|v| v.data.deref())
    }

    pub fn used_space(&self) -> usize {
        self.entries.len()
    }

    pub unsafe fn get_unchecked(&self, idx: Idx) -> &T {
        &self.entries.get_unchecked(idx.get()).data
    }

    pub unsafe fn get_unchecked_mut(&mut self, idx: Idx) -> &mut T {
        &mut self.entries.get_unchecked_mut(idx.get()).data
    }
}

impl<T> Index<Idx> for FreeList<T> {
    type Output = T;

    fn index(&self, index: Idx) -> &Self::Output {
        unsafe { &*self.entries[index.get()].data }
    }
}

impl<T> IndexMut<Idx> for FreeList<T> {
    fn index_mut(&mut self, index: Idx) -> &mut Self::Output {
        unsafe { &mut *self.entries[index.get()].data }
    }
}

#[cfg(test)]
#[test]
fn test_freelist() {
    let mut freelist: FreeList<[u32; 16]> = FreeList::new();
    let first = freelist.add([0; 16]);
    let second = freelist.add([1; 16]);
    let third = freelist.add([2; 16]);
    assert_eq!(freelist.used_space(), 4);
    freelist.remove(second);
    assert_eq!(freelist.used_space(), 4);
    let forth = freelist.add([3; 16]);
    assert_eq!(freelist.used_space(), 4);
    assert_eq!(second, forth);
    let fifth = freelist.add([4; 16]);
    assert_eq!(freelist.used_space(), 5);

    assert_eq!(freelist[first], [0; 16]);
    assert_eq!(freelist[third], [2; 16]);
    assert_eq!(freelist[forth], [3; 16]);
    assert_eq!(freelist[fifth], [4; 16]);
}
