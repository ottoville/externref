use crate::{math2::{Vec3F32, VertexKind}, vertices::PositionAndNormal, Geometry};

pub const BOX_POSITIONS2: [PositionAndNormal; 24] = [
    // Left face
    PositionAndNormal {
        position: Vec3F32 {
            x: -1.0, y: 1.0, z: -1.0
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
            x: -1.0, y: -1.0, z: 1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    },
    PositionAndNormal {
        position: Vec3F32 {
            x: -1.0, y: -1.0, z: -1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    },
    // Right face
    PositionAndNormal {
        position: Vec3F32 {
            x: 1.0, y: -1.0, z: 1.0
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
            x: 1.0, y: 1.0, z: -1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    },
    PositionAndNormal {
        position: Vec3F32 {
            x: 1.0, y: -1.0, z: -1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    },
    // Bottom face
    PositionAndNormal {
        position: Vec3F32 {
            x: -1.0, y: -1.0, z: 1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    },
    PositionAndNormal {
        position: Vec3F32 {
            x: 1.0, y: -1.0, z: 1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    },
    PositionAndNormal {
        position: Vec3F32 {
            x: 1.0, y: -1.0, z: -1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    },
    PositionAndNormal {
        position: Vec3F32 {
            x: -1.0, y: -1.0, z: -1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
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
            x: 0.0, y: 1.0, z: 0.0
        }
    },
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
            x: -1.0, y: 1.0, z: -1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    },
    PositionAndNormal {
        position: Vec3F32 {
            x: -1.0, y: -1.0, z: -1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    },
    // Last face
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
            x: 1.0, y: 1.0, z: 1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    },
    PositionAndNormal {
        position: Vec3F32 {
            x: 1.0, y: -1.0, z: 1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    },
    PositionAndNormal {
        position: Vec3F32 {
            x: -1.0, y: -1.0, z: 1.0
        },
        normal: Vec3F32 {
            x: 0.0, y: 1.0, z: 0.0
        }
    }
];

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
    let mut geometry = Box::new(Geometry::new(true, true, false, false));
    geometry.set_indices(BOX_INDICES.to_vec());
    geometry.set_vertices(VertexKind::PositionAndNormal(Box::new(BOX_POSITIONS2)), 8);
    Box::into_raw(geometry)
}