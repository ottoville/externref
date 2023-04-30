use crate::math2::{Vec3F32, Vec4};

pub struct Quaternion {
    pub i: f32,
    pub j: f32,
    pub k: f32,
    pub w: f32,
}
impl Quaternion {
    pub fn to_matrix(&self) -> Vec4<Vec4<f32>> {
        let ii = self.i * self.i;
        let jj = self.j * self.j;
        let kk = self.k * self.k;
        let ij = self.i * self.j;
        let kw = self.k * self.w;
        let ki = self.k * self.i;
        let jw = self.j * self.w;
        let jk = self.j * self.k;
        let iw = self.i * self.w;
        let mut result: Vec4<Vec4<f32>> = Vec4 {
            x: Vec4 {
                x: 0.0,
                y: 0.0,
                z: 0.0,
                w: 0.0,
            },
            y: Vec4 {
                x: 0.0,
                y: 0.0,
                z: 0.0,
                w: 0.0,
            },
            z: Vec4 {
                x: 0.0,
                y: 0.0,
                z: 0.0,
                w: 0.0,
            },
            w: Vec4 {
                x: 0.0,
                y: 0.0,
                z: 0.0,
                w: 0.0,
            },
        };
        result.x.x = 1.0 - 2.0 * (jj + kk);
        result.x.y = 2.0 * (ij + kw);
        result.x.z = 2.0 * (ki - jw);
        result.x.w = 0.0;

        result.y.x = 2.0 * (ij - kw);
        result.y.y = 1.0 - 2.0 * (kk + ii);
        result.y.z = 2.0 * (jk + iw);
        result.y.w = 0.0;

        result.z.x = 2.0 * (ki + jw);
        result.z.y = 2.0 * (jk - iw);
        result.z.z = 1.0 - 2.0 * (jj + ii);
        result.z.w = 0.0;

        result.w.x = 0.0;
        result.w.y = 0.0;
        result.w.z = 0.0;
        result.w.w = 1.0;
        return result;
    }
    pub fn to_euler_angles(&self, result: &mut Vec3F32) {
        let qz = self.k;
        let qx = self.i;
        let qy = self.j;
        let qw = self.w;

        let z_axis_y = qy * qz - qx * qw;
        let limit = 0.4999999;

        if z_axis_y < -limit {
            result.y = 2.0 * f32::atan2(qy, qw);
            result.x = std::f32::consts::PI * 0.5;
            result.z = 0.0;
        } else if z_axis_y > limit {
            result.y = 2.0 * f32::atan2(qy, qw);
            result.x = std::f32::consts::PI * -0.5;
            result.z = 0.0;
        } else {
            let sqw = qw * qw;
            let sqz = qz * qz;
            let sqx = qx * qx;
            let sqy = qy * qy;
            result.z = f32::atan2(2.0 * (qx * qy + qz * qw), -sqz - sqx + sqy + sqw);
            result.x = f32::asin(-2.0 * z_axis_y);
            result.y = f32::atan2(2.0 * (qz * qx + qy * qw), sqz - sqx - sqy + sqw);
        }
    }
}
#[cfg(test)]
#[test]
fn test_quaternion() {
    let q = Quaternion {
        i: 1.0,
        j: 2.0,
        k: 3.0,
        w: 4.0,
    };
    let mut euler = Vec3F32 {
        x: 0.0,
        y: 0.0,
        z: 0.0,
    };
    q.to_euler_angles(&mut euler);
    assert_eq!(
        euler,
        Vec3F32 {
            x: -1.5707964,
            y: 0.9272952,
            z: 0.0
        }
    )
}
