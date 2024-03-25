use crate::{math2::{Vec2F32, Vec3F32, VertexKind}, vertices::PositionAndNormalAndUV, Geometry};

#[no_mangle]

pub unsafe extern "C" fn create_tiled_mesh_geometry(width: f32, height: f32) -> *const Geometry<VertexKind> {
    let mut geometry = Box::new(Geometry::new(true, true, false, false, "quad_mesh_geometry".to_string()));
    let (positions, indices) = create_tiled_mesh(width as u32, height as u32);
    
    geometry.set_indices(indices.to_vec());
    geometry.set_vertices(VertexKind::PositionAndNormalAndUV(positions), 12);
    Box::into_raw(geometry)
}

fn create_tiled_mesh(
    faces_x_count: u32,
    faces_y_count: u32,
) -> (Vec<PositionAndNormalAndUV>, Vec<u32>) {
    let width = faces_x_count as f32;
    let height = faces_y_count as f32;
    let max = width.max(height) * 0.5;
    let positions_x_count = faces_x_count + 1;
    let positions_y_count = faces_y_count + 1;

    let mut indices_matrix: Vec<u32> = Vec::with_capacity((faces_x_count * faces_y_count * 6) as usize);
    let mut position_matrix: Vec<PositionAndNormalAndUV> =
        Vec::with_capacity((positions_y_count * positions_x_count) as usize);

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

