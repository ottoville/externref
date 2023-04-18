use crate::mesh::Mesh;

#[no_mangle]
pub unsafe extern "C" fn create_tiled_mesh_ptr(width: usize, height: usize) -> *mut usize {
    let (positions, indices) = create_tiled_mesh(width, height);
    let drop_pos = std::mem::ManuallyDrop::new(positions);
    let drop_ind = std::mem::ManuallyDrop::new(indices);
    let mut ptrs = [
        drop_pos.len(),
        drop_pos.as_ptr() as usize,
        drop_ind.len(),
        drop_ind.as_ptr() as usize,
    ];
    let ptr = ptrs.as_mut_ptr();
    return ptr;
}

fn create_tiled_mesh(width: usize, height: usize) -> (Vec<usize>, Vec<usize>) {
    let mut positions: Vec<usize> = vec![0, 0];
    let mut indices: Vec<usize> = vec![0];
    let mut backwards = false;
    for row in 0..height {
        positions.push(if backwards { width } else { 0 });
        positions.push(row + 1);
        indices.push((positions.len() - 2) / 2);
        for i in 1..=width {
            if !backwards && row == 0 {
                positions.push(i);
                positions.push(row);
                indices.push((positions.len() - 2) / 2);
            } else {
                indices.push(indices[indices.len() - i * 4]);
            }
            positions.push(if backwards { width - i } else { i });
            positions.push(row + 1);
            indices.push((positions.len() - 2) / 2);
        }
        backwards = !backwards;
    }
    return (positions, indices);
}
#[cfg(test)]
#[test]
fn test_quad_mesh() {
    let (positions, indices) = create_tiled_mesh(3, 2);
    assert_eq!(
        positions,
        vec![0, 0, 0, 1, 1, 0, 1, 1, 2, 0, 2, 1, 3, 0, 3, 1, 3, 2, 2, 2, 1, 2, 0, 2]
    );
    assert_eq!(indices, vec![0, 1, 2, 3, 4, 5, 6, 7, 8, 5, 9, 3, 10, 1, 11]);
}
pub unsafe fn create_quad_ground() -> usize {
    Mesh::new(0.0, 0.0, 0.0, false, false, false, String::from("box"))
}
