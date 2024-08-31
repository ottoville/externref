// Guard for not referencing index with only type that was returned from allocator.
#[derive(Debug, Copy, Clone)]
#[repr(transparent)]
pub struct FreeIndexIndex(pub usize);
/**
 * Memory allocation table for memory held in GPU
 */
pub struct FreeIndex {
    free_slots: Vec<usize>,
    free_index: usize,
}
impl FreeIndex {
    pub fn new() -> Self {
        FreeIndex {
            free_slots: Vec::with_capacity(64),
            free_index: 0,
        }
    }
    pub fn allocate(&mut self) -> FreeIndexIndex {
        return FreeIndexIndex(self.free_slots.pop().unwrap_or_else(|| {
            let id = self.free_index;
            self.free_index += 1;
            return id;
        }));
    }
    pub fn remove(&mut self, idx: FreeIndexIndex) {
        self.free_slots.push(idx.0);
    }
}
#[cfg(test)]
#[test]
fn test_freeindex() {
    let mut freelist: FreeIndex = FreeIndex::new();
    let first = freelist.allocate();
    assert_eq!(first.0, 0);
    let second = freelist.allocate();
    assert_eq!(second.0, 1);

    let third = freelist.allocate();
    assert_eq!(third.0, 2);

    freelist.remove(second);
    let fourth = freelist.allocate();
    assert_eq!(fourth.0, 1);
}
