use std::mem::MaybeUninit;

pub struct StackAllocator<T, const N: usize> {
    entries: [MaybeUninit<T>; N],
    next_free: usize,
}

impl<T, const N: usize> StackAllocator<T, N> {
    pub const fn new() -> Self {
        StackAllocator {
            entries: [const { MaybeUninit::<T>::uninit() }; N],
            next_free: 0,
        }
    }
    pub fn push(&mut self, value: T) {
        if self.next_free == N {
            panic!("StackAllocator out of available memory");
        }
        self.entries[self.next_free] = MaybeUninit::new(value);
        self.next_free += 1;
    }
    pub fn pop(&mut self) -> Option<T> {
        if self.next_free == 0 {
            return Option::None;
        }
        self.next_free -= 1;
        unsafe {
            let value = self.entries.get_unchecked(self.next_free);
            let assumed = Option::Some(value.assume_init_read());
            return assumed;
        }
    }
    pub fn clear(&mut self) {
        let mut n = 0;
        while n < self.next_free {
            unsafe { 
                let value = self.entries.get_unchecked_mut(n);
                value.assume_init_drop() }
            n += 1;
        }
        self.next_free = 0;
    }
    pub fn drain(&mut self) -> StackAllocatorDrain<T, N> {
        StackAllocatorDrain {
            stack_allocator: self,
        }
    }
}
impl<T, const N: usize> Drop for StackAllocator<T, N> {
    fn drop(&mut self) {
        self.clear();
    }
}

struct StackAllocatorDrain<'a, T, const N: usize> {
    stack_allocator: &'a mut StackAllocator<T, N>,
}
impl<'a, T, const N: usize> Iterator for StackAllocatorDrain<'a, T, N> {
    type Item = T;
    fn next(&mut self) -> Option<Self::Item> {
        self.stack_allocator.pop()
    }
}

#[cfg(test)]
#[test]
fn test_stack_allocator() {
    let mut stack: StackAllocator<i32, 10> = StackAllocator::new();
    stack.push(1);
    stack.push(2);
    assert_eq!(stack.pop().unwrap(), 2);
    stack.push(3);
    assert_eq!(stack.pop().unwrap(), 3);
    assert_eq!(stack.pop().unwrap(), 1);
    assert_eq!(stack.pop(), None);
    stack.push(1);
    stack.push(2);
    stack.clear();
    assert_eq!(stack.pop(), None);
}
#[cfg(test)]
#[test]
fn test_stack_allocator_drain() {
    let mut stack: StackAllocator<i32, 10> = StackAllocator::new();
    stack.push(1);
    stack.push(2);
    stack.push(3);

    let mut iterator = stack.drain();
    assert_eq!(iterator.next(), Some(3));
    assert_eq!(iterator.next(), Some(2));
    assert_eq!(iterator.next(), Some(1));
    assert_eq!(iterator.next(), None);
}
