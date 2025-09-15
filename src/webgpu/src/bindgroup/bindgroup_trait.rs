pub trait BindGroupTrait: Send + Sync {
    fn make_dirty(&self);
}