use std::{
    marker::PhantomData,
    mem::ManuallyDrop,
    num::NonZeroU32,
    ops::{Index, IndexMut},
};
struct Slot<T> {
    /**
     * Each insert adds one.
     */
    generation: NonZeroU32,
    /**
     * If exists, current slot is removed
     */
    next_free: Option<u32>,
    data: ManuallyDrop<T>,
}

#[repr(C)]
#[derive(Copy, Clone)]
struct InnerIndex {
    idx: u32,
    generation: NonZeroU32,
}

// Guard for not referencing index with only type that was returned from allocator.
#[repr(transparent)]
#[derive(Copy, Clone)]
pub struct ExplicitGenerationalFreeListIndex<T> {
    idx: InnerIndex,
    phantom: PhantomData<T>,
}

impl<T> ExplicitGenerationalFreeListIndex<T> {
    pub fn compare_with_raw(&self, id: u32, generation: NonZeroU32) -> bool {
        self.idx.idx == id && self.idx.generation == generation
    }
}

/**
 Pooled free list allocation with generation index where each free slot contains pointer to next free slot
 and each slot itself contains information whetever it is occupied to allow
 fast iteration
*/
pub struct ExplicitGenerationalFreeList<T> {
    entries: Vec<Slot<T>>,
    next_free: u32,
}
impl<T> ExplicitGenerationalFreeList<T> {
    pub fn new(capacity: usize) -> Self {
        ExplicitGenerationalFreeList {
            entries: Vec::with_capacity(capacity),
            next_free: 0,
        }
    }
    pub fn insert(&mut self, value: T) -> (ExplicitGenerationalFreeListIndex<fn() -> T>, &mut T) {
        let idx = self.next_free;
        let generation = if idx == self.entries.len() as u32 {
            self.next_free += 1;
            let generation = unsafe { NonZeroU32::new_unchecked(1) };
            self.entries.push(Slot {
                generation,
                next_free: None,
                data: ManuallyDrop::new(value),
            });
            generation
        } else {
            unsafe {
                let freeslot = self.entries.get_unchecked_mut(idx as usize);

                freeslot.generation = match freeslot.generation.checked_add(1) {
                    Some(generation) => generation,
                    None => NonZeroU32::new_unchecked(1),
                };
                self.next_free = freeslot.next_free.take().unwrap_unchecked();
                freeslot.data = ManuallyDrop::new(value);
                freeslot.generation
            }
        };
        return (
            ExplicitGenerationalFreeListIndex::<fn() -> T> {
                idx: InnerIndex { idx, generation },
                phantom: PhantomData,
            },
            unsafe { &mut self.entries.last_mut().unwrap_unchecked().data },
        );
    }
    pub fn remove(&mut self, index: ExplicitGenerationalFreeListIndex<fn() -> T>) -> bool {
        let entry = unsafe { self.entries.get_unchecked_mut(index.idx.idx as usize) };
        if entry.generation == index.idx.generation {
            entry.next_free = Some(self.next_free);
            self.next_free = index.idx.idx;
            unsafe { ManuallyDrop::drop(&mut entry.data) };
            return true;
        }
        return false;
    }
    pub fn iter(&self) -> impl Iterator<Item = &T> {
        self.entries.iter().filter_map(|entry| {
            if entry.next_free.is_some() {
                return None;
            }
            return Some(&*entry.data);
        })
    }
    pub fn iter_mut(&mut self) -> impl Iterator<Item = &mut T> {
        self.entries.iter_mut().filter_map(|entry| {
            if entry.next_free.is_some() {
                return None;
            }
            return Some(&mut *entry.data);
        })
    }
    pub fn get(&self, index: &ExplicitGenerationalFreeListIndex<fn() -> T>) -> Option<&T> {
        unsafe {
            let entry = self.entries.get_unchecked(index.idx.idx as usize);
            if entry.generation == index.idx.generation {
                return Some(&entry.data);
            }
            return None;
        }
    }
    pub fn get_mut(
        &mut self,
        index: &ExplicitGenerationalFreeListIndex<fn() -> T>,
    ) -> Option<&mut T> {
        unsafe {
            let entry = self.entries.get_unchecked_mut(index.idx.idx as usize);
            if entry.generation == index.idx.generation {
                return Some(&mut entry.data);
            }
            return None;
        }
    }
    pub fn used_space(&self) -> usize {
        self.entries.len()
    }
}
impl<T> Index<&ExplicitGenerationalFreeListIndex<fn() -> T>> for ExplicitGenerationalFreeList<T> {
    type Output = T;
    fn index(&self, index: &ExplicitGenerationalFreeListIndex<fn() -> T>) -> &Self::Output {
        self.get(index).unwrap()
    }
}
impl<T> IndexMut<&ExplicitGenerationalFreeListIndex<fn() -> T>>
    for ExplicitGenerationalFreeList<T>
{
    fn index_mut(
        &mut self,
        index: &ExplicitGenerationalFreeListIndex<fn() -> T>,
    ) -> &mut Self::Output {
        self.get_mut(index).unwrap()
    }
}
impl<T> Drop for Slot<T> {
    fn drop(&mut self) {
        if core::mem::needs_drop::<T>() && self.next_free.is_none() {
            unsafe { ManuallyDrop::drop(&mut self.data) };
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
fn test_generational_explicit_freelist() {
    {
        let mut freelist: ExplicitGenerationalFreeList<TestEntry> =
            ExplicitGenerationalFreeList::new(2);
        let (first_6, _) = freelist.insert(TestEntry(6)); // 6
        freelist.remove(first_6); // empty
        let first_0 = freelist.insert(TestEntry(0)).0; //0
        let (second_1, _) = freelist.insert(TestEntry(1)); //0,1
        let second_idx = second_1.idx.idx;
        let third_2 = freelist.insert(TestEntry(2)).0; //0,1,2
        assert_eq!(freelist.used_space(), 3);
        freelist.remove(second_1.clone()); //0,empty,2

        assert_ne!(freelist.get(&second_1).is_none(), true);

        assert_eq!(freelist.used_space(), 3);
        let (forth_3, _) = freelist.insert(TestEntry(3)); //0,3,2
        assert_eq!(freelist.used_space(), 3);
        assert_eq!(second_idx, forth_3.idx.idx);
        assert_eq!(freelist.get(&forth_3).is_some(), true);
        assert_eq!(freelist.get(&second_1).is_some(), false);

        let fifth_4 = freelist.insert(TestEntry(4)).0; //0,3,2,4
        assert_eq!(freelist.used_space(), 4);
        assert_eq!(freelist[&first_0].0, 0);
        assert_eq!(freelist[&third_2].0, 2);
        assert_eq!(freelist[&forth_3].0, 3);
        assert_eq!(freelist[&fifth_4].0, 4);
        freelist.remove(forth_3); //0,empty,2,4

        let mut items = freelist.iter();
        assert_eq!(items.next().unwrap().0, freelist[&first_0].0);
        assert_eq!(items.next().unwrap().0, freelist[&third_2].0);
        assert_eq!(items.next().unwrap().0, freelist[&fifth_4].0);
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
