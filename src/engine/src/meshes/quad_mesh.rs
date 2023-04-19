use crate::{mesh::Mesh, MULTIVALUE_USIZE};

#[no_mangle]
pub unsafe extern "C" fn create_tiled_mesh_ptr(width: usize, height: usize) -> *const usize {
    let (positions, indices) = create_tiled_mesh2(width, height);
    let drop_pos = std::mem::ManuallyDrop::new(positions);
    let drop_ind = std::mem::ManuallyDrop::new(indices);
    MULTIVALUE_USIZE[0] = drop_pos.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = drop_pos.len();
    MULTIVALUE_USIZE[2] = drop_pos.capacity();
    MULTIVALUE_USIZE[3] = drop_ind.as_ptr() as usize;
    MULTIVALUE_USIZE[4] = drop_ind.len();
    MULTIVALUE_USIZE[5] = drop_ind.capacity();
    return MULTIVALUE_USIZE.as_ptr();
}

fn create_tiled_mesh2(faces_x_count: usize, faces_y_count: usize) -> (Vec<usize>, Vec<usize>) {
    let positions_x_count = faces_x_count +1;
    let positions_y_count = faces_y_count +1;

    let mut position_matrix:Vec<usize> = Vec::with_capacity(positions_y_count * positions_x_count * 2);
    let mut indices_matrix:Vec<usize> = Vec::with_capacity(faces_x_count * faces_y_count * 6);

    let mut h = 0;
    let mut w = 0;
    while h <= positions_y_count - 1 {
        w = 0;
        while w <= positions_x_count - 1 {
            position_matrix.push(w);
            position_matrix.push(h);
            if w != 0 && h != 0 {
                indices_matrix.push((h * positions_x_count) + (w));
                indices_matrix.push((h * positions_x_count) + (w - 1));
                indices_matrix.push(((h - 1) * positions_x_count) + (w - 1));
                indices_matrix.push(((h - 1) * positions_x_count) + (w - 1));
                indices_matrix.push(((h - 1) * positions_x_count) + (w));
                indices_matrix.push((h * positions_x_count) + (w));
            }
            w = w + 1;
        }
        h = h + 1;
    }
    return (position_matrix, indices_matrix);
}
const fn create_tiled_mesh<
    const POSITIONS_X_COUNT: usize,
    const POSITIONS_Y_COUNT: usize,
    const FACES_X_COUNT: usize,
    const FACES_Y_COUNT: usize,
    >() -> ([[[usize; 2]; POSITIONS_X_COUNT]; POSITIONS_Y_COUNT], [[[usize; 6]; FACES_X_COUNT]; FACES_Y_COUNT]) {
    
    assert!(FACES_Y_COUNT + 1  == POSITIONS_Y_COUNT);
    assert!(FACES_X_COUNT + 1  == POSITIONS_X_COUNT);
    
    let mut position_matrix: [[[usize; 2]; POSITIONS_X_COUNT]; POSITIONS_Y_COUNT] =
        [[[0, 0]; POSITIONS_X_COUNT]; POSITIONS_Y_COUNT];
    let mut indices_matrix: [[[usize; 6]; FACES_X_COUNT]; FACES_Y_COUNT] =
        [[[0, 0, 0, 0, 0, 0]; FACES_X_COUNT]; FACES_Y_COUNT];
    let indices_per_row = POSITIONS_X_COUNT;

    let mut h = 0;
    let mut w = 0;
    while h <= POSITIONS_Y_COUNT - 1 {
        w = 0;
        while w <= POSITIONS_X_COUNT - 1 {
            position_matrix[h][w] = [w, h];
            if w != 0 && h != 0 {
                let ih = h - 1;
                let iw = w - 1;
                indices_matrix[ih][iw] = [
                    (h * indices_per_row) + (w),
                    (h * indices_per_row) + (w - 1),
                    ((h - 1) * indices_per_row) + (w - 1),
                    ((h - 1) * indices_per_row) + (w - 1),
                    ((h - 1) * indices_per_row) + (w),
                    (h * indices_per_row) + (w),
                ];
            }
            w = w + 1;
        }
        h = h + 1;
    }
    return (position_matrix, indices_matrix);
}
#[cfg(test)]
#[test]
fn test_quad_mesh() {
    let (positions, indices) = create_tiled_mesh::<4, 3, 3, 2>();
    assert_eq!(
        positions,
        [[[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 1], [1, 1], [2, 1], [3, 1]], [[0, 2], [1, 2], [2, 2], [3, 2]]]
    );
    assert_eq!(
        indices,
        [[[5, 4, 0, 0, 1, 5], [6, 5, 1, 1, 2, 6], [7, 6, 2, 2, 3, 7]], [[9, 8, 4, 4, 5, 9], [10, 9, 5, 5, 6, 10], [11, 10, 6, 6, 7, 11]]]
    );
}
pub unsafe fn create_quad_ground() -> usize {
    let mesh_id = Mesh::new(0.0, 0.0, 0.0, false, false, false, String::from("Quad_mesh"));
    return mesh_id
}
