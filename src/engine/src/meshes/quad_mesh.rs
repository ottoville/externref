use crate::{math2::{Vec3F32, PositionAndNormalAndUV, Vec2F32}, mesh::Mesh, MULTIVALUE_USIZE};

#[no_mangle]
pub unsafe extern "C" fn create_tiled_mesh_ptr(width: f32, height: f32) -> *const usize {
    let (positions, indices) = create_tiled_mesh(width as usize, height as usize);
    let drop_pos = std::mem::ManuallyDrop::new(positions);
    let drop_ind = std::mem::ManuallyDrop::new(indices);
    MULTIVALUE_USIZE[0] = drop_pos.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = drop_pos.len() * 12;
    MULTIVALUE_USIZE[2] = drop_pos.capacity() * 12;
    MULTIVALUE_USIZE[3] = drop_ind.as_ptr() as usize;
    MULTIVALUE_USIZE[4] = drop_ind.len();
    MULTIVALUE_USIZE[5] = drop_ind.capacity();
    return MULTIVALUE_USIZE.as_ptr();
}

fn create_tiled_mesh(
    faces_x_count: usize,
    faces_y_count: usize,
) -> (Vec<PositionAndNormalAndUV>, Vec<usize>) {
    let width = faces_x_count as f32;
    let height = faces_y_count as f32;
    let max = width.max(height) * 0.5;
    let positions_x_count = faces_x_count + 1;
    let positions_y_count = faces_y_count + 1;

    let mut indices_matrix: Vec<usize> = Vec::with_capacity(faces_x_count * faces_y_count * 6);
    let mut position_matrix: Vec<PositionAndNormalAndUV> =
        Vec::with_capacity(positions_y_count * positions_x_count);

    for h in 0..=faces_y_count {
        let z = (h as f32 - (height * 0.5)) / max;
        for w in 0..=faces_x_count {
            let x = w as f32;
            position_matrix.push(
                PositionAndNormalAndUV {
                    position: Vec3F32 {
                        x: (x - (width * 0.5)) / max,
                        y: 0.0,
                        z,
                    }, normal: Vec3F32 {
                        x: 0.0,
                        y: 1.0,
                        z: 0.0,
                    }, 
                    uv: Vec2F32 {
                        u: 0.0,
                        v: 1.0,
                    }
                });
            if w != 0 && h != 0 {
                indices_matrix.push((h * positions_x_count) + (w));
                indices_matrix.push((h * positions_x_count) + (w - 1));
                indices_matrix.push(((h - 1) * positions_x_count) + (w - 1));
                indices_matrix.push(((h - 1) * positions_x_count) + (w - 1));
                indices_matrix.push(((h - 1) * positions_x_count) + (w));
                indices_matrix.push((h * positions_x_count) + (w));
            }
        }
    }
    return (position_matrix, indices_matrix);
}

#[cfg(test)]
#[test]
fn test_quad_mesh() {
    let (vertices, indices) = create_tiled_mesh(3, 2);
    let mut max: f32 = 0.0;
    let mut min: f32 = 0.0;
    let mut positions: Vec<Vec3F32> = Vec::with_capacity(vertices.len());
    let mut i: usize = 0;
    positions.resize_with(vertices.len(), || {
        let position = &vertices[i].position;
        max = max.max(position.x).max(position.z);
        min = min.min(position.x).min(position.z);

        assert_eq!(vertices[i].normal.x, 0.0);
        assert_eq!(vertices[i].normal.y, 1.0);
        assert_eq!(vertices[i].normal.z, 0.0);

        i += 1;
        return position.clone();
    });

    assert_eq!(max, 1.0);
    assert_eq!(min, -1.0);

    assert_eq!(
        positions,
        vec![
            Vec3F32 {
                x: -1.0,
                y: 0.0,
                z: -0.6666667
            },
            Vec3F32 {
                x: -0.33333334,
                y: 0.0,
                z: -0.6666667
            },
            Vec3F32 {
                x: 0.33333334,
                y: 0.0,
                z: -0.6666667
            },
            Vec3F32 {
                x: 1.0,
                y: 0.0,
                z: -0.6666667
            },
            Vec3F32 {
                x: -1.0,
                y: 0.0,
                z: 0.0
            },
            Vec3F32 {
                x: -0.33333334,
                y: 0.0,
                z: 0.0
            },
            Vec3F32 {
                x: 0.33333334,
                y: 0.0,
                z: 0.0
            },
            Vec3F32 {
                x: 1.0,
                y: 0.0,
                z: 0.0
            },
            Vec3F32 {
                x: -1.0,
                y: 0.0,
                z: 0.6666667
            },
            Vec3F32 {
                x: -0.33333334,
                y: 0.0,
                z: 0.6666667
            },
            Vec3F32 {
                x: 0.33333334,
                y: 0.0,
                z: 0.6666667
            },
            Vec3F32 {
                x: 1.0,
                y: 0.0,
                z: 0.6666667
            }
        ]
    );
    assert_eq!(
        indices,
        vec![5, 4, 0, 0, 1, 5, 6, 5, 1, 1, 2, 6, 7, 6, 2, 2, 3, 7, 9, 8, 4, 4, 5, 9, 10, 9, 5, 5, 6, 10, 11, 10, 6, 6, 7, 11]
    );
}
pub unsafe fn create_quad_ground() -> usize {
    let mesh_id = Mesh::new(
        0.0,
        0.0,
        0.0,
        false,
        false,
        false,
        String::from("Quad_mesh"),
    );
    return mesh_id;
}
