use crate::{math2::Vec3F32, MULTIVALUE_USIZE};

struct Patch {
    patch_points_a: Vec<usize>,
    patch_points_b: Vec<usize>,
    patch_points_c: Vec<usize>,
}
#[no_mangle]
pub unsafe extern "C" fn create_octasphere(
    num_subdivisions: u32,
    half_width: f32,
    half_height: f32,
    half_depth: f32,
) -> *const usize {
    let n = (2u32).pow(num_subdivisions + 1) as usize;
    let num_faces_per_patch = if num_subdivisions == 1 { // (n * ((n + 1.0) / 2.0))
        10
    } else if num_subdivisions == 2 {
        36
    } else if num_subdivisions == 3 {
        146
    } else if num_subdivisions == 4 {
        528
    } else if num_subdivisions == 5 {
        2080
    } else {
        panic!("Too many subdivisions")
    };
    let total_faces_count = num_faces_per_patch * 8;
    let total_vertices_count = total_faces_count;

    let mut vertices_and_normals: Vec<[Vec3F32; 2]> = Vec::with_capacity(total_vertices_count);

    let cells_per_patch = (n - 2) * (n - 1) + n - 1;
    let indices_per_path = cells_per_patch * 3;
    let mut indices_count = indices_per_path * 8;
    vertices_and_normals.resize_with(total_vertices_count, || {
        [
            Vec3F32 {
                x: 0.0,
                y: 0.0,
                z: 0.0,
            },
            Vec3F32 {
                x: 0.0,
                y: 0.0,
                z: 0.0,
            },
        ]
    });

    // First patch tessellation
    let mut first_index = 0;
    if half_width > 0.0 {
        indices_count += (n - 1) * 6 * 4;
    }
    if half_height > 0.0 {
        indices_count += (n - 1) * 6 * 4;
    }
    if half_depth > 0.0 {
        indices_count += (n - 1) * 6 * 4;
    }

    if half_width > 0.0 && half_height > 0.0 && half_depth > 0.0 {
        indices_count += 36; //6*6
    } else if (half_width > 0.0 && half_height > 0.0)
        || (half_width > 0.0 && half_depth > 0.0)
        || (half_height > 0.0 && half_depth > 0.0)
    {
        indices_count += 12; //2*6
    }
    let mut indices: Vec<usize> = vec![0; indices_count];

    let mut vert_index = 0;
    let mut indices_count = 0;
    let mut points_a: Vec<usize> = vec![0; n];
    let mut points_b: Vec<usize> = vec![0; n];
    let mut points_c: Vec<usize> = vec![0; n];

    for i in 0..n {
        let theta = (std::f32::consts::PI * 0.5 * (i as f32)) / (n as f32 - 1.0);
        let col = n - 1 - i;
        let point_a_index = vert_index;
        vert_index = vert_index + 1;

        let point_a = Vec3F32 {
            x: 0.0,
            y: theta.sin(),
            z: theta.cos(),
        };

        //let point_a = &mut verticesAndNormals[pointAindex][0];
        //point_a.y = theta.sin();
        //point_a.z = theta.cos();
        points_a[i] = point_a_index;
        if col > 0 {
            if i == 0 {
                points_c[0] = point_a_index;
            }
            let num_segments = n - 1 - i;
            let point_b_index = vert_index + num_segments - 1;
            let point_b = Vec3F32 {
                x: theta.cos(),
                y: theta.sin(),
                z: 0.0,
            };
            points_b[i] = point_b_index;
            // compute_geodesic

            //dot product
            let dot = point_a.dot(&point_b);

            let angle_between_endpoints = dot.acos();

            let mut rotation_axis = point_a.cross(&point_b);
            vertices_and_normals[point_b_index][1] = point_b.clone();
            vertices_and_normals[point_b_index][0] = point_b;

            rotation_axis.normalize();
            let dtheta = angle_between_endpoints / num_segments as f32;
            for point_index in 1..num_segments {
                point_a.apply_rotation_quaternion_to_ref(
                    rotation_axis.to_quaternion(point_index as f32 * dtheta),
                    &mut vertices_and_normals[vert_index][0],
                );
                //Copy position to normal
                vertices_and_normals[vert_index][1] = vertices_and_normals[vert_index][0].clone();
                vert_index = vert_index + 1;
                if i == 0 {
                    points_c[point_index] = vert_index - 1
                }
            }
            if i == 0 {
                points_c[n - 1] = point_b_index;
            }

            vert_index = vert_index + 1;
        } else {
            points_b[i] = vert_index - 1;
        }
        vertices_and_normals[point_a_index][1] = point_a.clone();
        vertices_and_normals[point_a_index][0] = point_a;

        if i < n - 1 {
            let a = first_index + 1;
            let b = first_index + col + 1;
            let c = first_index + col + 2;
            for row in 0..col - 1 {
                indices[indices_count] = first_index + row;
                indices_count += 1;
                indices[indices_count] = a + row;
                indices_count += 1;
                indices[indices_count] = b + row;
                indices_count += 1;
                indices[indices_count] = b + row;
                indices_count += 1;
                indices[indices_count] = a + row;
                indices_count += 1;
                indices[indices_count] = c + row;
                indices_count += 1;
            }

            let row = col - 1;
            indices[indices_count] = first_index + row;
            indices_count += 1;
            indices[indices_count] = a + row;
            indices_count += 1;
            indices[indices_count] = b + row;
            indices_count += 1;

            first_index = b;
        }
    }

    //TODO: Convert to 8 sized array
    let mut patches: Vec<Patch> = Vec::with_capacity(8);
    let mut i = 0;
    patches.resize_with(7, || {
        let mut patch_points_a: Vec<usize> = vec![0; n];
        let mut patch_points_b: Vec<usize> = vec![0; n];
        let mut patch_points_c: Vec<usize> = vec![0; n];
        for j in 0..num_faces_per_patch {
            if i == 0 {
                vertices_and_normals[vert_index][0] = Vec3F32 {
                    x: vertices_and_normals[j][0].z,
                    y: vertices_and_normals[j][0].y,
                    z: -vertices_and_normals[j][0].x,
                };
                vertices_and_normals[vert_index][1] = vertices_and_normals[vert_index][0].clone();
                vertices_and_normals[vert_index][0].add(half_width, half_height, -half_depth);
                vert_index += 1;
            } else if i == 1 {
                vertices_and_normals[vert_index][0] = Vec3F32 {
                    x: -vertices_and_normals[j][0].x,
                    y: vertices_and_normals[j][0].y,
                    z: -vertices_and_normals[j][0].z,
                };
                vertices_and_normals[vert_index][1] = vertices_and_normals[vert_index][0].clone();
                vertices_and_normals[vert_index][0].add(-half_width, half_height, -half_depth);

                vert_index += 1;
            } else if i == 2 {
                vertices_and_normals[vert_index][0] = Vec3F32 {
                    x: -vertices_and_normals[j][0].z,
                    y: vertices_and_normals[j][0].y,
                    z: vertices_and_normals[j][0].x,
                };
                vertices_and_normals[vert_index][1] = vertices_and_normals[vert_index][0].clone();
                vertices_and_normals[vert_index][0].add(-half_width, half_height, half_depth);

                vert_index += 1;
            } else if i == 3 {
                vertices_and_normals[vert_index][0] = Vec3F32 {
                    x: vertices_and_normals[j][0].x,
                    y: -vertices_and_normals[j][0].z,
                    z: vertices_and_normals[j][0].y,
                };
                vertices_and_normals[vert_index][1] = vertices_and_normals[vert_index][0].clone();
                vertices_and_normals[vert_index][0].add(half_width, -half_height, half_depth);

                vert_index += 1;
            } else if i == 4 {
                vertices_and_normals[vert_index][0] = Vec3F32 {
                    x: vertices_and_normals[j][0].y,
                    y: -vertices_and_normals[j][0].z,
                    z: -vertices_and_normals[j][0].x,
                };
                vertices_and_normals[vert_index][1] = vertices_and_normals[vert_index][0].clone();
                vertices_and_normals[vert_index][0].add(half_width, -half_height, -half_depth);
                vert_index += 1;
            } else if i == 5 {
                vertices_and_normals[vert_index][0] = Vec3F32 {
                    x: -vertices_and_normals[j][0].x,
                    y: -vertices_and_normals[j][0].z,
                    z: -vertices_and_normals[j][0].y,
                };
                vertices_and_normals[vert_index][1] = vertices_and_normals[vert_index][0].clone();
                vertices_and_normals[vert_index][0].add(-half_width, -half_height, -half_depth);
                vert_index += 1;
            } else if i == 6 {
                vertices_and_normals[vert_index][0] = Vec3F32 {
                    //index out of bounds: the len is 256 but the index is 256
                    x: -vertices_and_normals[j][0].y,
                    y: -vertices_and_normals[j][0].z,
                    z: vertices_and_normals[j][0].x,
                };
                vertices_and_normals[vert_index][1] = vertices_and_normals[vert_index][0].clone();
                vertices_and_normals[vert_index][0].add(-half_width, -half_height, half_depth);
                vert_index += 1;
            }
            match points_a.iter().position(|x| *x == j) {
                Some(ind) => {
                    patch_points_a[ind] = vert_index - 1;
                }
                None => {}
            };
            match points_b.iter().position(|x| *x == j) {
                Some(ind) => {
                    patch_points_b[ind] = vert_index - 1;
                }
                None => {}
            };
            match points_c.iter().position(|x| *x == j) {
                Some(ind) => {
                    patch_points_c[ind] = vert_index - 1;
                }
                None => {}
            };
        }
        for j in 0..cells_per_patch {
            indices[indices_count] = indices[j * 3] + (i + 1) * num_faces_per_patch;
            indices_count = indices_count + 1;
            indices[indices_count] = indices[j * 3 + 1] + (i + 1) * num_faces_per_patch;
            indices_count = indices_count + 1;
            indices[indices_count] = indices[j * 3 + 2] + (i + 1) * num_faces_per_patch;
            indices_count = indices_count + 1;
        }
        i += 1;
        return Patch {
            patch_points_a,
            patch_points_b,
            patch_points_c,
        };
    });
    patches.insert(
        0,
        Patch {
            patch_points_a: points_a,
            patch_points_b: points_b,
            patch_points_c: points_c,
        },
    );

    if half_width > 0.0 || half_height > 0.0 || half_depth > 0.0 {
        for j in 0..num_faces_per_patch {
            vertices_and_normals[j][0].x += half_width;
            vertices_and_normals[j][0].y += half_height;
            vertices_and_normals[j][0].z += half_depth;
        }
    }

    let mut points_left: Vec<usize> = Vec::new();
    let mut points_right: Vec<usize> = Vec::new();
    if half_width > 0.0 {
        patches[6].patch_points_a.reverse();
        patches[5].patch_points_c.reverse();
        patches[2].patch_points_a.reverse();
        patches[1].patch_points_b.reverse();
        let points =  [
            [&patches[6].patch_points_a, &patches[5].patch_points_c],
            [&patches[7].patch_points_c, &patches[4].patch_points_a],
            [&patches[3].patch_points_b, &patches[0].patch_points_a],
            [&patches[2].patch_points_a, &patches[1].patch_points_b],
        ];
        let first_points = [points[0][0][0], points[0][1][0]];
        for i in 0..4 {
            let point_tuple = points[i];

            points_left.extend(point_tuple[0]);
            points_right.extend(point_tuple[1]);
            let dimension = if i % 2 == 1 {half_height } else { half_depth};
            if i < 3 && dimension == 0.0 {
                /*
                    BOTTOM/SIDE1/TOP
                    Do not draw side when its area size is 0.
                    Draw what is in buffer and reset it.
                */
                indices_count = draw_connection(&mut points_left, &mut indices, indices_count, &mut points_right);
            }   
        }
                /*
            SIDE2, Draw last side if area is greater than zero, close the circle
        */
        if half_height > 0.0 {
            points_left.push(first_points[0]);
            points_right.push(first_points[1]);     
        }
        indices_count = draw_connection(&mut points_left, &mut indices, indices_count, &mut points_right);
    }
    if half_depth > 0.0 {
        patches[5].patch_points_a.reverse();
        patches[4].patch_points_c.reverse();
        patches[1].patch_points_a.reverse();
        patches[0].patch_points_b.reverse();
        let points = [
            [&patches[5].patch_points_a, &patches[4].patch_points_c],
            [&patches[6].patch_points_c, &patches[7].patch_points_a],
            [&patches[2].patch_points_b, &patches[3].patch_points_a],
            [&patches[1].patch_points_a, &patches[0].patch_points_b],
        ];

        let first_points = [points[0][0][0], points[0][1][0]];
        for i in 0..4 {
            let point_tuple = points[i];
            points_left.extend(point_tuple[0].iter());
            points_right.extend(point_tuple[1].iter());
            if (i == 1 && half_height > 0.0) || i == 3 {
                /*
                    SIDE3
                    Only draw a side when its area size is greater than zero.
                    Early exit here not to clear the drawing buffer and continue draw a side.
                    When i === 3 it is last side and handled manually after this loop.
                */
                continue;
            }
            /*
                BOTTOM/TOP has already been draw with width-draw
                Flush the buffer.
            */
            indices_count = draw_connection(
                &mut points_left,
                &mut indices,
                indices_count,
                &mut points_right,
            );
        }
        if half_height > 0.0 {
            /*
                SIDE4, Draw last side if area is greater than zero, close the circle
            */
            points_left.push(first_points[0]);
            points_right.push(first_points[1]);
        }
        indices_count = draw_connection(
            &mut points_left,
            &mut indices,
            indices_count,
            &mut points_right,
        );
    }
    if half_height > 0.0 {
        let height_tuples = [
            [&patches[7], &patches[3]],
            [&patches[6], &patches[2]],
            [&patches[5], &patches[1]],
            [&patches[4], &patches[0]],
        ];
        for tuple in height_tuples.into_iter() {
            points_left.extend(tuple[0].patch_points_b.iter());
            points_right.extend(tuple[1].patch_points_c.iter().rev());
            indices_count = draw_connection(
                &mut points_left,
                &mut indices,
                indices_count,
                &mut points_right,
            );
        }
    }
    // Normalize coordinates
    if half_width > 0.0 || half_height > 0.0 || half_depth > 0.0 {
        let max = 1.0 + half_width.max(half_height.max(half_depth));
        if max != 1.0 {
            for vert in vertices_and_normals.iter_mut() {
                vert[0].x /= max;
                vert[0].y /= max;
                vert[0].z /= max;
            }
        }
    }
    let vertices_buf = std::mem::ManuallyDrop::new(vertices_and_normals);
    let indices_buf = std::mem::ManuallyDrop::new(indices);
    MULTIVALUE_USIZE[0] = vertices_buf.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = vertices_buf.len();
    MULTIVALUE_USIZE[2] = vertices_buf.capacity();
    MULTIVALUE_USIZE[3] = indices_buf.as_ptr() as usize;
    MULTIVALUE_USIZE[4] = indices_buf.len();
    MULTIVALUE_USIZE[5] = indices_buf.capacity();
    return MULTIVALUE_USIZE.as_ptr();
}
fn draw_connection(
    left: &mut Vec<usize>,
    indices: &mut Vec<usize>,
    mut indices_count: usize,
    right: &mut Vec<usize>,
) -> usize {
    for index in 0..left.len() - 1 {
        let point = left[index];
        indices[indices_count] = point;
        indices_count += 1;
        indices[indices_count] = right[index];
        indices_count += 1;
        indices[indices_count] = left[index + 1];
        indices_count += 1;

        indices[indices_count] = left[index + 1];
        indices_count += 1;
        indices[indices_count] = right[index];
        indices_count += 1;
        indices[indices_count] = right[index + 1];
        indices_count += 1;
    }
    left.clear();
    right.clear();
    return indices_count;
}
#[cfg(test)]
#[test]
fn test_draw_connection() {
    let mut indices = vec![0usize; 42];
    let mut indices_count = 0;
    let mut left: Vec<usize> = vec![251, 249, 246, 242, 237, 231, 224, 216];
    let mut right: Vec<usize> = vec![187, 186, 185, 184, 183, 182, 181, 180];
    indices_count = draw_connection(&mut left, &mut indices, indices_count, &mut right);
    assert_eq!(left.len(), 0);
    assert_eq!(right.len(), 0);
    assert_eq!(indices_count, 42);
    assert_eq!(
        indices,
        vec![
            251, 187, 249, 249, 187, 186, 249, 186, 246, 246, 186, 185, 246, 185, 242, 242, 185,
            184, 242, 184, 237, 237, 184, 183, 237, 183, 231, 231, 183, 182, 231, 182, 224, 224,
            182, 181, 224, 181, 216, 216, 181, 180
        ]
    );
}
