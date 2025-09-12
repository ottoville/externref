use std::{cell::RefCell, sync::atomic::AtomicU32};

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;
use terramath::{CrossProduct, Quaternion, Vec3wgslF32, VectorMath, VectorMathF32};

use crate::{
    mesh::{Mesh, ENGINE},
    vertices::{PositionAndNormalAndColor, VertexKind},
    Geometry,
};

struct Patch {
    patch_points_a: Vec<usize>,
    patch_points_b: Vec<usize>,
    patch_points_c: Vec<usize>,
}
struct OctasphereHeap {
    points_left_cell: RefCell<Vec<usize>>,
    points_right_cell: RefCell<Vec<usize>>,
}
thread_local! {
    static OSTASPHERE_HEAP:OctasphereHeap = OctasphereHeap{
        points_left_cell: RefCell::new(Vec::new()),
        points_right_cell: RefCell::new(Vec::new()),
    }
}
static ID: AtomicU32 = AtomicU32::new(0);

#[no_mangle]
pub unsafe extern "C" fn create_octasphere(
    point_light: f32,
    directional_light: f32,
    scenes: f32,
    rigid_body: u32,
    camera_can_collide_to: bool,
    num_subdivisions: u32,
    half_width: f32,
    half_height: f32,
    half_depth: f32,
) -> *mut ExplicitGenerationalFreeListIndex<Mesh> {
    let mut label = String::from("OctaSphere");
    label.push_str(
        &ID.fetch_add(1, std::sync::atomic::Ordering::Release)
            .to_string(),
    );
    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id: ExplicitGenerationalFreeListIndex<Mesh> = Mesh::new(
        point_light,
        directional_light,
        scenes,
        rigid_body,
        label,
        None,
        None,
        &mut meshes,
        camera_can_collide_to,
    );
    let geometry =
        create_octasphere_geometry(num_subdivisions, half_width, half_height, half_depth);
    let mesh = &mut meshes[&mesh_id];
    mesh.geometry = Some(Box::new(geometry));
    Box::into_raw(Box::new(mesh_id))
}

pub fn create_octasphere_geometry(
    num_subdivisions: u32,
    half_width: f32,
    half_height: f32,
    half_depth: f32,
) -> Geometry {
    let n = (2u32).pow(num_subdivisions + 1) as usize;
    // (n * ((n + 1.0) / 2.0))
    let num_faces_per_patch = if num_subdivisions == 0 {
        3
    } else if num_subdivisions == 1 {
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

    let mut vertices_and_normals: Vec<PositionAndNormalAndColor> =
        Vec::with_capacity(total_vertices_count);

    let cells_per_patch = (n - 2) * (n - 1) + n - 1;
    let indices_per_path = cells_per_patch * 3;
    let mut indices_count = indices_per_path * 8;
    vertices_and_normals.resize_with(total_vertices_count, || PositionAndNormalAndColor {
        position: Vec3wgslF32([0.0; 3]),
        normal: Vec3wgslF32([0.0; 3]),
        color: Vec3wgslF32([0.0; 3]),
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

    let mut vert_index: usize = 0;
    let mut indices_count = 0;
    let mut points_a: Vec<usize> = vec![0; n];
    let mut points_b: Vec<usize> = vec![0; n];
    let mut points_c: Vec<usize> = vec![0; n];

    for i in 0..n {
        let theta = (std::f32::consts::FRAC_PI_2 * (i as f32)) / (n as f32 - 1.0);
        let col = n - 1 - i;
        let point_a_index = vert_index;
        vert_index = vert_index + 1;

        let point_a = Vec3wgslF32([0.0, theta.sin(), theta.cos()]);

        points_a[i] = point_a_index;
        if col > 0 {
            if i == 0 {
                points_c[0] = point_a_index;
            }
            let num_segments = n - 1 - i;
            let point_b_index = vert_index + num_segments - 1;
            let point_b = Vec3wgslF32([theta.cos(), theta.sin(), 0.0]);
            points_b[i] = point_b_index;
            // compute_geodesic

            //dot product
            let dot = point_a.0.dot(&point_b.0);

            let angle_between_endpoints = dot.acos();

            let mut rotation_axis = point_a.0.cross(&point_b.0);
            vertices_and_normals[point_b_index].normal = point_b.clone();
            vertices_and_normals[point_b_index].position = point_b;

            rotation_axis.normalize_in_place();
            let dtheta = angle_between_endpoints / num_segments as f32;
            for point_index in 1..num_segments {
                Quaternion::from_axis_angle(&rotation_axis, point_index as f32 * dtheta)
                    .apply_to_ref(point_a.0, &mut vertices_and_normals[vert_index].position.0);
                //Copy position to normal
                vertices_and_normals[vert_index].normal =
                    vertices_and_normals[vert_index].position.clone();
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
        vertices_and_normals[point_a_index].normal = point_a.clone();
        vertices_and_normals[point_a_index].position = point_a;

        if i < n - 1 {
            let a = first_index + 1;
            let b = first_index + col + 1;
            let c = first_index + col + 2;
            for row in 0..col - 1 {
                indices[indices_count] = first_index + row;
                indices_count += 1;
                indices[indices_count] = b + row;
                indices_count += 1;
                indices[indices_count] = a + row;
                indices_count += 1;
                indices[indices_count] = b + row;
                indices_count += 1;
                indices[indices_count] = c + row;
                indices_count += 1;
                indices[indices_count] = a + row;
                indices_count += 1;
            }

            let row = col - 1;
            indices[indices_count] = first_index + row;
            indices_count += 1;
            indices[indices_count] = b + row;
            indices_count += 1;
            indices[indices_count] = a + row;
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
                vertices_and_normals[vert_index].normal = Vec3wgslF32([
                    vertices_and_normals[j].position.0[2],
                    vertices_and_normals[j].position.0[1],
                    -vertices_and_normals[j].position.0[0],
                ]);
                vertices_and_normals[vert_index].position.0 = vertices_and_normals[vert_index]
                    .normal
                    .0
                    .add_vec(&[half_width, half_height, -half_depth]);
            } else if i == 1 {
                vertices_and_normals[vert_index].normal = Vec3wgslF32([
                    -vertices_and_normals[j].position.0[0],
                    vertices_and_normals[j].position.0[1],
                    -vertices_and_normals[j].position.0[2],
                ]);
                vertices_and_normals[vert_index].position.0 = vertices_and_normals[vert_index]
                    .normal
                    .0
                    .add_vec(&[-half_width, half_height, -half_depth]);
            } else if i == 2 {
                vertices_and_normals[vert_index].normal = Vec3wgslF32([
                    -vertices_and_normals[j].position.0[2],
                    vertices_and_normals[j].position.0[1],
                    vertices_and_normals[j].position.0[0],
                ]);
                vertices_and_normals[vert_index].position.0 = vertices_and_normals[vert_index]
                    .normal
                    .0
                    .add_vec(&[-half_width, half_height, half_depth]);
            } else if i == 3 {
                vertices_and_normals[vert_index].normal = Vec3wgslF32([
                    vertices_and_normals[j].position.0[0],
                    -vertices_and_normals[j].position.0[2],
                    vertices_and_normals[j].position.0[1],
                ]);
                vertices_and_normals[vert_index].position.0 = vertices_and_normals[vert_index]
                    .normal
                    .0
                    .add_vec(&[half_width, -half_height, half_depth]);
            } else if i == 4 {
                vertices_and_normals[vert_index].normal = Vec3wgslF32([
                    vertices_and_normals[j].position.0[1],
                    -vertices_and_normals[j].position.0[2],
                    -vertices_and_normals[j].position.0[0],
                ]);
                vertices_and_normals[vert_index].position.0 = vertices_and_normals[vert_index]
                    .normal
                    .0
                    .add_vec(&[half_width, -half_height, -half_depth]);
            } else if i == 5 {
                vertices_and_normals[vert_index].normal = Vec3wgslF32([
                    -vertices_and_normals[j].position.0[0],
                    -vertices_and_normals[j].position.0[2],
                    -vertices_and_normals[j].position.0[1],
                ]);
                vertices_and_normals[vert_index].position.0 = vertices_and_normals[vert_index]
                    .normal
                    .0
                    .add_vec(&[-half_width, -half_height, -half_depth]);
            } else if i == 6 {
                vertices_and_normals[vert_index].normal = Vec3wgslF32([
                    -vertices_and_normals[j].position.0[1],
                    -vertices_and_normals[j].position.0[2],
                    vertices_and_normals[j].position.0[0],
                ]);
                vertices_and_normals[vert_index].position.0 = vertices_and_normals[vert_index]
                    .normal
                    .0
                    .add_vec(&[-half_width, -half_height, half_depth]);
            }
            vert_index += 1;

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
        let half = [half_width, half_height, half_depth];
        for j in 0..num_faces_per_patch {
            vertices_and_normals[j].position.0.add_vec_in_place(&half);
        }
    }
    OSTASPHERE_HEAP.with(|oc| {
        let mut points_left = oc.points_left_cell.borrow_mut();
        let mut points_right = oc.points_right_cell.borrow_mut();

        if half_width > 0.0 {
            patches[6].patch_points_a.reverse();
            patches[5].patch_points_c.reverse();
            patches[2].patch_points_a.reverse();
            patches[1].patch_points_b.reverse();
            let points = [
                [&patches[6].patch_points_a, &patches[5].patch_points_c],
                [&patches[7].patch_points_c, &patches[4].patch_points_a],
                [&patches[3].patch_points_b, &patches[0].patch_points_a],
                [&patches[2].patch_points_a, &patches[1].patch_points_b],
            ];
            for i in 0..4 {
                let point_tuple = points[i];
                points_left.extend_from_slice(point_tuple[0]);
                points_right.extend_from_slice(point_tuple[1]);
                let dimension = if i % 2 == 1 { half_height } else { half_depth };
                if i < 3 && dimension == 0.0 {
                    /*
                        BOTTOM/SIDE1/TOP
                        Do not draw side when its area size is 0.
                        Draw what is in buffer and reset it.
                    */
                    indices_count = draw_connection(
                        &mut indices,
                        indices_count,
                        &mut points_left,
                        &mut points_right,
                    );
                }
            }
            /*
                SIDE2, Draw last side if area is greater than zero, close the circle
            */
            indices_count = close_circle(
                half_height,
                indices_count,
                &mut indices,
                points,
                &mut points_left,
                &mut points_right,
            );
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

            for i in 0..4 {
                let point_tuple = points[i];
                points_left.extend_from_slice(point_tuple[0]);
                points_right.extend_from_slice(point_tuple[1]);

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
                    &mut indices,
                    indices_count,
                    &mut points_left,
                    &mut points_right,
                );
            }
            /*
                SIDE4, Draw last side if area is greater than zero, close the circle
            */
            indices_count = close_circle(
                half_height,
                indices_count,
                &mut indices,
                points,
                &mut points_left,
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
                    &mut indices,
                    indices_count,
                    &mut points_left,
                    &mut points_right,
                );
            }
        }
    });

    // Normalize coordinates
    if half_width > 0.0 || half_height > 0.0 || half_depth > 0.0 {
        let max = 1.0 + half_width.max(half_height.max(half_depth));
        if max != 1.0 {
            for vert in vertices_and_normals.iter_mut() {
                vert.position.0.divide_in_place(max);
            }
        }
    }
    let mut geometry = Geometry::new(false, true, false, "octasphere_geometry".to_string());
    geometry.set_vertices(VertexKind::PositionAndNormalAndColor(vertices_and_normals));
    geometry.set_indices(indices);
    return geometry;
}

fn close_circle(
    half_height: f32,
    indices_count: usize,
    indices: &mut Vec<usize>,
    points: [[&Vec<usize>; 2]; 4],
    points_left: &mut Vec<usize>,
    points_right: &mut Vec<usize>,
) -> usize {
    if half_height > 0.0 {
        points_left.push(points[0][0][0]);
        points_right.push(points[0][1][0]);
    }
    return draw_connection(indices, indices_count, points_left, points_right);
}

fn draw_connection(
    indices: &mut Vec<usize>,
    mut indices_count: usize,
    points_left: &mut Vec<usize>,
    points_right: &mut Vec<usize>,
) -> usize {
    for index in 0..points_left.len() - 1 {
        indices[indices_count] = points_left[index + 1];
        indices_count += 1;
        indices[indices_count] = points_right[index];
        indices_count += 1;
        indices[indices_count] = points_left[index];
        indices_count += 1;

        indices[indices_count] = points_left[index + 1];
        indices_count += 1;
        indices[indices_count] = points_right[index + 1];
        indices_count += 1;
        indices[indices_count] = points_right[index];
        indices_count += 1;
    }
    points_left.clear();
    points_right.clear();
    return indices_count;
}
#[cfg(test)]
#[test]
fn test_draw_connection() {
    let mut indices = vec![0usize; 42];
    let mut indices_count = 0;
    OSTASPHERE_HEAP.with(|oc| {
        let mut points_left = oc.points_left_cell.borrow_mut();
        let mut points_right = oc.points_right_cell.borrow_mut();
        points_left.append(&mut vec![251, 249, 246, 242, 237, 231, 224, 216]);
        points_right.append(&mut vec![187, 186, 185, 184, 183, 182, 181, 180]);
        indices_count = draw_connection(
            &mut indices,
            indices_count,
            &mut points_left,
            &mut points_right,
        );
        assert_eq!(points_left.len(), 0);
        assert_eq!(points_right.len(), 0);
        assert_eq!(indices_count, 42);
        assert_eq!(
            indices,
            vec![
                249, 187, 251, 249, 186, 187, 246, 186, 249, 246, 185, 186, 242, 185, 246, 242,
                184, 185, 237, 184, 242, 237, 183, 184, 231, 183, 237, 231, 182, 183, 224, 182,
                231, 224, 181, 182, 216, 181, 224, 216, 180, 181
            ]
        );
    });
}
