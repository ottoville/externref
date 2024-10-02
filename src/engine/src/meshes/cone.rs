use std::{f32::consts::TAU, ops::Neg};

use crate::{
    vertices::{PositionAndNormal, VertexKind},
    Geometry,
};

/**
 * sin(Math.PI*05*0.5 + Math.PI*0.5*0.5*0.5) that is 45deg + 22,5deg
 */
// Enable when const_fn_floating_point_arithmetic;
//const SIDE_NORM_SIN: f32 = (FRAC_PI_4 + (FRAC_PI_4 * 0.5)).sin();
const SIDE_NORM_SIN: f32 = 0.9238795;

/**
 * cos(Math.PI*05*0.5 + Math.PI*0.5*0.5*0.5) that is 45deg + 22,5deg
 */
const SIDE_NORM_COS: f32 = 0.38268343;

/**
 * @param bottom_faces How many triangles there are on botton. Total sides of cone will be faces + 2
 * @returns
 */
#[no_mangle]
pub unsafe extern "C" fn create_cone_geometry(bottom_faces: usize) -> *mut Geometry {
    debug_assert_eq!(bottom_faces % 2, 0);
    let side_faces = bottom_faces + 2;
    let half_side = side_faces / 2;
    let mut vertices: Vec<PositionAndNormal> =
        vec![PositionAndNormal::new(); side_faces * 2 +  /* middle vertex: */ side_faces];
    let (bottom_vertices, rest_vertices) = vertices.split_at_mut(side_faces);
    let (side_bottom_vertices, top_vertices) = rest_vertices.split_at_mut(side_faces);
    let mut indices: Vec<usize> = vec![0; bottom_faces * 3 + side_faces * 3];

    // Triangle is divided to seqments twice much than side_faces, because upper vertices lies on middle of bottom vertices
    let seqment_len = TAU / (side_faces as f32 * 2.0);
    // Increase progress by double seqment len because every other seqment is used for top and every other bottom vertices;
    let seqment_interval = seqment_len * 2.0;
    let cull_ccw = true;

    bottom_vertices[0].position.0 = [0.0, -1.0, 1.0];
    bottom_vertices[0].normal.0 = [0.0, -1.0, 0.0];
    bottom_vertices[half_side].position.0 = [0.0, -1.0, -1.0];
    bottom_vertices[half_side].normal.0 = [0.0, -1.0, -0.0];

    side_bottom_vertices[0].position.0 = [0.0, -1.0, 1.0];
    side_bottom_vertices[0].normal.0 = [0.0, SIDE_NORM_COS, SIDE_NORM_SIN];

    side_bottom_vertices[half_side].position.0 = [0.0, -1.0, -1.0];
    side_bottom_vertices[half_side].normal.0 = [0.0, SIDE_NORM_COS, -SIDE_NORM_SIN];

    let (bottom_indices, side_indices) = indices.split_at_mut(bottom_faces * 3);

    bottom_indices[0] = 0;
    bottom_indices[1] = 1;
    bottom_indices[2] = side_faces - 1;
    let bottom_left_right_indices = &mut bottom_indices[3..(bottom_faces - 1) * 3];
    let mut progress = seqment_interval;
    // Create bottom vertices and indices
    for i in 0..bottom_faces / 2 {
        let mut x = progress.sin();
        if cull_ccw {
            x = x.neg();
        }
        let z = progress.cos();
        // Increase progress by double seqment len because every other seqment is used for top vertices;
        progress += seqment_interval;
        bottom_vertices[i + 1].position.0 = [x, -1.0, z];
        bottom_vertices[i + 1].normal.0 = [0.0, -1.0, 0.0];
        bottom_vertices[half_side + i + 1].position.0 = [-x, -1.0, -z];
        bottom_vertices[half_side + i + 1].normal.0 = [0.0, -1.0, 0.0];
        side_bottom_vertices[i + 1].position.0 = [x, -1.0, z];
        side_bottom_vertices[i + 1].normal.0 =
            [x * SIDE_NORM_SIN, SIDE_NORM_COS, z * SIDE_NORM_SIN];
        side_bottom_vertices[half_side + i + 1].position.0 = [-x, -1.0, -z];
        side_bottom_vertices[half_side + i + 1].normal.0 =
            [-x * SIDE_NORM_SIN, SIDE_NORM_COS, -z * SIDE_NORM_SIN];
    }
    for i in 0..(bottom_faces / 2) - 1 {
        bottom_left_right_indices[i * 6] = i + 1;
        bottom_left_right_indices[i * 6 + 1] = i + 2;
        bottom_left_right_indices[i * 6 + 2] = side_faces - (i + 1);

        bottom_left_right_indices[i * 6 + 3] = side_faces - (i + 2);
        bottom_left_right_indices[i * 6 + 4] = side_faces - (i + 1);
        bottom_left_right_indices[i * 6 + 5] = i + 2;
    }
    progress = seqment_len;
    // Top vertices
    for i in 0..half_side {
        let mut x = progress.sin();
        if cull_ccw {
            x = x.neg();
        }
        let z = progress.cos();
        progress += seqment_interval;
        top_vertices[i].position.0 = [0.0, 1.0, 0.0];
        top_vertices[i].normal.0 = [x * SIDE_NORM_SIN, SIDE_NORM_COS, z * SIDE_NORM_SIN];
        top_vertices[half_side + i].position.0 = [0.0, 1.0, 0.0];
        top_vertices[half_side + i].normal.0 =
            [-x * SIDE_NORM_SIN, SIDE_NORM_COS, -z * SIDE_NORM_SIN];
    }
    bottom_indices[(bottom_faces - 1) * 3] = bottom_faces / 2;
    bottom_indices[(bottom_faces - 1) * 3 + 1] = bottom_faces / 2 + 1;
    bottom_indices[(bottom_faces - 1) * 3 + 2] = bottom_faces / 2 + 2;

    for i in 0..side_faces {
        side_indices[i * 3] = side_faces + i;
        side_indices[i * 3 + 1] = side_faces * 2 + i;
        side_indices[i * 3 + 2] = side_faces + 1 + i;
    }
    // Close the circle by setting last indice to first
    side_indices[side_faces * 3 - 1] = side_faces;

    let mut geometry = Box::new(Geometry::new(true, false, false, false, "Cone".to_string()));
    geometry.set_vertices(VertexKind::PositionAndNormal(vertices));
    geometry.set_indices(indices);
    return Box::into_raw(geometry);
}
#[cfg(test)]
#[test]
fn test_cone() {
    unsafe {
        let geometry_ptr = create_cone_geometry(4);
        let geometry: Box<Geometry> = Box::from_raw(geometry_ptr);
        assert_eq!(
            geometry.indices.indices,
            vec![
                0, 1, 5, 1, 2, 5, 4, 5, 2, 2, 3, 4, 6, 12, 7, 7, 13, 8, 8, 14, 9, 9, 15, 10, 10,
                16, 11, 11, 17, 6
            ]
        );
    }
}
