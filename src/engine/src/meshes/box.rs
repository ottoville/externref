use crate::{math2::Vec3F32, vertices::{PositionAndNormal, VertexKind}, Geometry};

pub fn create_box_vertices() -> Vec<PositionAndNormal> {
    vec![
        // Left face
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: 1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: -1.0, y: 0.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: 1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: -1.0, y: 0.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: -1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: -1.0, y: 0.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: -1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: -1.0, y: 0.0, z: 0.0
            }
        },
        // Right face
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: -1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: 1.0, y: 0.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: 1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: 1.0, y: 0.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: 1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: 1.0, y: 0.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: -1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: 1.0, y: 0.0, z: 0.0
            }
        },
        // Bottom face
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: -1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: -1.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: -1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: -1.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: -1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: -1.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: -1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: -1.0, z: 0.0
            }
        },
        // Top face
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: 1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 1.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: 1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 1.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: 1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 1.0, z: 0.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: 1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 1.0, z: 0.0
            }
        },
        // Back face
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: -1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 0.0, z: -1.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: 1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 0.0, z: -1.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: 1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 0.0, z: -1.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: -1.0, z: -1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 0.0, z: -1.0
            }
        },
        // Last face
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: 1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 0.0, z: 1.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: 1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 0.0, z: 1.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: 1.0, y: -1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 0.0, z: 1.0
            }
        },
        PositionAndNormal {
            position: Vec3F32 {
                x: -1.0, y: -1.0, z: 1.0
            },
            normal: Vec3F32 {
                x: 0.0, y: 0.0, z: 1.0
            }
        }
    ]
}

pub const BOX_INDICES : [u32; 36] =
    [
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // back
        8, 9, 10, 8, 10, 11,   // top
        12, 13, 14, 12, 14, 15,   // bottom
        16, 17, 18, 16, 18, 19,   // right
        20, 21, 22, 20, 22, 23,   // left
    ];

#[no_mangle]
pub unsafe extern "C" fn create_box_geometry() -> *const Geometry<VertexKind> {
    let mut geometry = Box::new(Geometry::new(true, true, false, false, "box_geometry".to_string()));
    geometry.set_indices(BOX_INDICES.to_vec());
    geometry.set_vertices(VertexKind::PositionAndNormal(create_box_vertices()), 8);
    Box::into_raw(geometry)
}


#[cfg(test)]
#[test]
fn test_calculate_normals() {
    let mut geometry: Geometry<VertexKind> = Geometry::new(true, true, false, false, "box_geometry".to_string());
    geometry.set_indices(BOX_INDICES.to_vec());
    let vertices = create_box_vertices();
    geometry.set_vertices(VertexKind::PositionAndNormal(vertices), 8);
    geometry.calculate_normals();
    if let VertexKind::PositionAndNormal(vertices) = geometry.vertices.vertices {
        for n in 0..vertices.len() {
            assert_eq!(vertices[n].normal, vertices[n].normal);
        }
    } else {
        panic!("Vertices are bad format")
    }
}
