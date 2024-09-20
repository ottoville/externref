use crate::{math2::Vec3wgslF32, vertices::{PositionAndNormal, VertexKind}, Geometry};

pub fn create_rtp_vertices() -> Vec<PositionAndNormal> {
    vec![
        // Left face
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [-1.0, 1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [-1.0, 0.0, 0.0]
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [-1.0, -1.0, 1.0]
            },
            normal: Vec3wgslF32 {
                vec: [-1.0, 0.0, 0.0]
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [-1.0, -1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [-1.0, 0.0, 0.0]
            }
        },
        // Right face
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [1.0, -1.0, 1.0]
            },
            normal: Vec3wgslF32 {
                vec: [1.0, 0.0, 0.0]
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [1.0, 1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [1.0, 0.0, 0.0]
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [1.0, -1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [1.0, 0.0, 0.0]
            }
        },
        // Bottom face
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [-1.0, -1.0, 1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, -1.0, 0.0]
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [1.0, -1.0, 1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, -1.0, 0.0]
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [1.0, -1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, -1.0, 0.0]
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [-1.0, -1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, -1.0, 0.0]
            }
        },
        // Top face
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [1.0, 1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, 0.7071067811865475, 0.7071067811865475] // 1/Math.hypot(-1,1)
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [1.0, -1.0, 1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, 0.7071067811865475, 0.7071067811865475] // 1/Math.hypot(-1,1)
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [-1.0, -1.0, 1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, 0.7071067811865475, 0.7071067811865475] // 1/Math.hypot(-1,1)
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [-1.0, 1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, 0.7071067811865475, 0.7071067811865475] // 1/Math.hypot(-1,1)
            }
        },
        // Back face
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [1.0, -1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, 0.0, -1.0]
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [1.0, 1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, 0.0, -1.0]
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [-1.0, 1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, 0.0, -1.0]
            }
        },
        PositionAndNormal {
            position: Vec3wgslF32 {
                vec: [-1.0, -1.0, -1.0]
            },
            normal: Vec3wgslF32 {
                vec: [0.0, 0.0, -1.0]
            }
        },
    ]
}
// 0, 1, 2,     3, 4, 5
pub const RTP_INDICES : [usize; 24] =
    [
        0, 1, 2,    // front
        3, 4, 5,    // back
        6, 7, 8, 6, 8, 9,   // top
        10, 11, 12, 10, 12, 13,   // bottom
        14, 15, 16, 14, 16, 17,   // right
    ];

#[no_mangle]
pub unsafe extern "C" fn create_rtp_geometry() -> *const Geometry {
    let mut geometry = Box::new(Geometry::new(true, true, false, false, "rtp_geometry".to_string()));
    geometry.set_indices(RTP_INDICES.to_vec());
    geometry.set_vertices(VertexKind::PositionAndNormal(create_rtp_vertices()), 8);
    Box::into_raw(geometry)
}
