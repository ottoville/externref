use std::collections::HashMap;

use terramath::VectorMath;

use crate::{
    vertices::{PositionAndNormal, VertexKind},
    Geometry,
};

fn add_mid_point(
    mid_cache: &mut HashMap<u64, usize>,
    v: usize,
    vertices: &mut Vec<PositionAndNormal>,
    a: usize,
    b: usize,
) -> (usize, bool) {
    let sum = a + b;
    let mul: u64 = sum as u64 * (sum + 1) as u64;
    let triangular_number = mul / 2;
    let cantor_pairing = triangular_number + a.min(b) as u64;
    let cached = mid_cache.remove(&cantor_pairing);
    if let Some(i) = cached {
        return (i, false);
    }

    mid_cache.insert(cantor_pairing, v);
    vertices[v].position.0[0] = (vertices[a].position.0[0] + vertices[b].position.0[0]) / 2.0;
    vertices[v].position.0[1] = (vertices[a].position.0[1] + vertices[b].position.0[1]) / 2.0;
    vertices[v].position.0[2] = (vertices[a].position.0[2] + vertices[b].position.0[2]) / 2.0;
    return (v, true);
}

#[no_mangle]
pub unsafe extern "C" fn create_icosphere_geometry(order: usize) -> *mut Geometry {
    // set up a 20-triangle icosahedron
    let f: f32 = 1.618034; // (1 + 5 ** 0.5) / 2;
    let t: usize = 4usize.pow(order as u32);
    let mut vertices: Vec<PositionAndNormal> = vec![PositionAndNormal::new(); 10 * t + 2];

    vertices[0].position.0 = [-1.0, f, 0.0];
    vertices[1].position.0 = [1.0, f, 0.0];
    vertices[2].position.0 = [-1.0, -f, 0.0];
    vertices[3].position.0 = [1.0, -f, 0.0];
    vertices[4].position.0 = [0.0, -1.0, f];
    vertices[5].position.0 = [0.0, 1.0, f];
    vertices[6].position.0 = [0.0, -1.0, -f];
    vertices[7].position.0 = [0.0, 1.0, -f];
    vertices[8].position.0 = [f, 0.0, -1.0];
    vertices[9].position.0 = [f, 0.0, 1.0];
    vertices[10].position.0 = [-f, 0.0, -1.0];
    vertices[11].position.0 = [-f, 0.0, 1.0];

    let mut indices: Vec<[usize; 3]> = vec![
        [0, 11, 5],
        [0, 5, 1],
        [0, 1, 7],
        [0, 7, 10],
        [0, 10, 11],
        [11, 10, 2],
        [5, 11, 4],
        [1, 5, 9],
        [7, 1, 8],
        [10, 7, 6],
        [3, 9, 4],
        [3, 4, 2],
        [3, 2, 6],
        [3, 6, 8],
        [3, 8, 9],
        [9, 8, 1],
        [4, 9, 5],
        [2, 4, 11],
        [6, 2, 10],
        [8, 6, 7],
    ];
    let mut mid_cache: HashMap<u64, usize> = HashMap::new();
    let mut v: usize = 12;
    for _ in 0..order {
        let triangles_prev = indices;
        indices = vec![[0usize; 3]; triangles_prev.len() * 4];
        for k in 0..triangles_prev.len() {
            let v1 = triangles_prev[k][0];
            let v2 = triangles_prev[k][1];
            let v3 = triangles_prev[k][2];

            let (a, added) = add_mid_point(&mut mid_cache, v, &mut vertices, v1, v2);
            if added {
                v += 1;
            }
            let (b, added) = add_mid_point(&mut mid_cache, v, &mut vertices, v2, v3);
            if added {
                v += 1;
            }
            let (c, added) = add_mid_point(&mut mid_cache, v, &mut vertices, v3, v1);
            if added {
                v += 1;
            }
            let t = k * 4;
            indices[t] = [v1, a, c];
            indices[t + 1] = [v2, b, a];
            indices[t + 2] = [v3, c, b];
            indices[t + 3] = [a, b, c];
        }
    }
    for vertice in &mut vertices {
        vertice.position.0.normalize_in_place();
        vertice.normal.0 = vertice.position.0.clone();
    }
    let mut geometry = Box::new(Geometry::new(
        true,
        false,
        false,
        false,
        "Icosphere".to_string(),
    ));
    geometry.set_vertices(VertexKind::PositionAndNormal(vertices));
    let flattened = indices.as_flattened_mut().to_vec();
    geometry.set_indices(flattened);
    return Box::into_raw(geometry);
}
#[cfg(test)]
#[test]
fn test_icosphere() {
    unsafe {
        let geometry_ptr = create_icosphere_geometry(1);
        let geometry: Box<Geometry> = Box::from_raw(geometry_ptr);
        assert_eq!(
            geometry.indices.indices,
            vec![
                0, 12, 14, 11, 13, 12, 5, 14, 13, 12, 13, 14, 0, 14, 16, 5, 15, 14, 1, 16, 15, 14,
                15, 16, 0, 16, 18, 1, 17, 16, 7, 18, 17, 16, 17, 18, 0, 18, 20, 7, 19, 18, 10, 20,
                19, 18, 19, 20, 0, 20, 12, 10, 21, 20, 11, 12, 21, 20, 21, 12, 11, 21, 23, 10, 22,
                21, 2, 23, 22, 21, 22, 23, 5, 13, 25, 11, 24, 13, 4, 25, 24, 13, 24, 25, 1, 15, 27,
                5, 26, 15, 9, 27, 26, 15, 26, 27, 7, 17, 29, 1, 28, 17, 8, 29, 28, 17, 28, 29, 10,
                19, 31, 7, 30, 19, 6, 31, 30, 19, 30, 31, 3, 32, 34, 9, 33, 32, 4, 34, 33, 32, 33,
                34, 3, 34, 36, 4, 35, 34, 2, 36, 35, 34, 35, 36, 3, 36, 38, 2, 37, 36, 6, 38, 37,
                36, 37, 38, 3, 38, 40, 6, 39, 38, 8, 40, 39, 38, 39, 40, 3, 40, 32, 8, 41, 40, 9,
                32, 41, 40, 41, 32, 9, 41, 27, 8, 28, 41, 1, 27, 28, 41, 28, 27, 4, 33, 25, 9, 26,
                33, 5, 25, 26, 33, 26, 25, 2, 35, 23, 4, 24, 35, 11, 23, 24, 35, 24, 23, 6, 37, 31,
                2, 22, 37, 10, 31, 22, 37, 22, 31, 8, 39, 29, 6, 30, 39, 7, 29, 30, 39, 30, 29
            ]
        );
    }
}
