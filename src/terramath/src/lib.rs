pub struct Quaternion {
    pub i: f32,
    pub j: f32,
    pub k: f32,
    pub w: f32,
}
impl Quaternion {
    pub fn to_matrix(&self) -> [[f32; 4]; 4] {
        let ii = self.i * self.i;
        let jj = self.j * self.j;
        let kk = self.k * self.k;
        let ij = self.i * self.j;
        let kw = self.k * self.w;
        let ki = self.k * self.i;
        let jw = self.j * self.w;
        let jk = self.j * self.k;
        let iw = self.i * self.w;
        let mut result: [[f32; 4]; 4] = [[0.0; 4]; 4];
        result[0][0] = 1.0 - 2.0 * (jj + kk);
        result[0][1] = 2.0 * (ij + kw);
        result[0][2] = 2.0 * (ki - jw);

        result[1][0] = 2.0 * (ij - kw);
        result[1][1] = 1.0 - 2.0 * (kk + ii);
        result[1][2] = 2.0 * (jk + iw);

        result[2][0] = 2.0 * (ki + jw);
        result[2][1] = 2.0 * (jk - iw);
        result[2][2] = 1.0 - 2.0 * (jj + ii);

        result[3][3] = 1.0;
        return result;
    }
    pub fn to_euler_angles(&self, result: &mut [f32; 3]) {
        let qz = self.k;
        let qx = self.i;
        let qy = self.j;
        let qw = self.w;

        let z_axis_y = qy.mul_add(qz, -qx * qw);
        let limit = 0.4999999;

        if z_axis_y < -limit {
            result[1] = 2.0 * f32::atan2(qy, qw);
            result[0] = std::f32::consts::PI * 0.5;
            result[2] = 0.0;
        } else if z_axis_y > limit {
            result[1] = 2.0 * f32::atan2(qy, qw);
            result[0] = std::f32::consts::PI * -0.5;
            result[2] = 0.0;
        } else {
            let sqw = qw * qw;
            let sqz = qz * qz;
            let sqx = qx * qx;
            let sqy = qy * qy;
            result[2] = f32::atan2(2.0 * (qx.mul_add(qy, qz * qw)), -sqz - sqx + sqy + sqw);
            result[0] = f32::asin(-2.0 * z_axis_y);
            result[1] = f32::atan2(2.0 * (qz.mul_add(qx, qy * qw)), sqz - sqx - sqy + sqw);
        }
    }
    pub fn from_euler(vec: &[f32; 3]) -> Quaternion {
        // Produces a quaternion from Euler angles in the z-y-x orientation (Tait-Bryan angles)
        let half_roll = vec[2] * 0.5;
        let half_pitch = vec[0] * 0.5;
        let half_yaw = vec[1] * 0.5;

        let sin_roll = half_roll.sin();
        let cos_roll = half_roll.cos();
        let sin_pitch = half_pitch.sin();
        let cos_pitch = half_pitch.cos();
        let sin_yaw = half_yaw.sin();
        let cos_yaw = half_yaw.cos();
        Quaternion {
            i: (cos_yaw * sin_pitch).mul_add(cos_roll, sin_yaw * cos_pitch * sin_roll),
            j: (sin_yaw * cos_pitch).mul_add(cos_roll, -(cos_yaw * sin_pitch * sin_roll)),
            k: (cos_yaw * cos_pitch).mul_add(sin_roll, -(sin_yaw * sin_pitch * cos_roll)),
            w: (cos_yaw * cos_pitch).mul_add(cos_roll, sin_yaw * sin_pitch * sin_roll),
        }
    }
    /**
    http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm
    assumes axis is normalized
    */
    pub fn from_axis_angle(vec: &[f32; 3], angle: f32) -> Quaternion {
        let half_angle = angle * 0.5;
        let s = half_angle.sin();
        Quaternion {
            i: vec[0] * s,
            j: vec[1] * s,
            k: vec[2] * s,
            w: half_angle.cos(),
        }
    }
    pub fn apply_to_ref(&self, vector: [f32; 3], result: &mut [f32; 3]) {
        let t0 = vector[0];
        let t1 = vector[1];
        let t2 = vector[2];

        let ix = self.k.mul_add(-t1, self.w.mul_add(t0, self.j * t2));
        let iy = self.i.mul_add(-t2, self.w.mul_add(t1, self.k * t0));
        let iz = self.j.mul_add(-t0, self.w.mul_add(t2, self.i * t1));
        let iw = self.k.mul_add(-t2, self.i.mul_add(-t0, self.j * -t1));

        result[0] = ix.mul_add(
            self.w,
            iw.mul_add(-self.i, iy.mul_add(-self.k, iz * self.j)),
        );
        result[1] = iy.mul_add(
            self.w,
            iw.mul_add(-self.j, iz.mul_add(-self.i, ix * self.k)),
        );
        result[2] = iz.mul_add(
            self.w,
            iw.mul_add(-self.k, ix.mul_add(-self.j, iy * self.i)),
        );
    }
}
#[cfg(test)]
#[test]
fn test_quaternion() {
    let q = Quaternion {
        i: 1.5,
        j: 2.5,
        k: 3.5,
        w: 4.6,
    };
    let v: [f32; 3] = [1.5, 2.5, 3.5];
    let mut res: [f32; 3] = [0.0, 0.0, 0.0];
    q.apply_to_ref(v, &mut res);
    assert_eq!(res[0], 62.864998);
    assert_eq!(res[1], 104.774994);
    assert_eq!(res[2], 146.685);

    let mut euler: [f32; 3] = [1.4363252145, 2.2365431785583496, 0.3259182870388031];
    let q2 = Quaternion::from_euler(&euler);
    q2.to_euler_angles(&mut euler);
    assert_eq!(euler[0], 1.4363245);
    assert_eq!(euler[1], 2.2365434);
    assert_eq!(euler[2], 0.32591859);
}
pub trait CrossProduct<T> {
    fn cross(&self, other: &Self) -> Self;
    fn cross_to_ref(&self, other: &Self, result: &mut Self);
}
pub trait VectorMath<T, const N: usize> {
    fn dot(&self, other: &Self) -> T;
    fn min(&self, other: &Self) -> Self;
    fn max(&self, other: &Self) -> Self;
    fn get_min(&self) -> T;
    fn get_max(&self) -> T;
    /**
     * Set all values to zero
     */
    fn clear(&mut self);
    /**
     * Returns new vector which is sub of two vectors
     */
    fn sub_vec(&self, other: &Self) -> Self;
    /**
     * Returns new vector which is multiplied with scalar
     */
    fn multiply(&mut self, multiplier: f32) -> Self;

    /**
     * multiply vector with scalar
     */
    fn multiply_in_place(&mut self, multiplier: f32);

    /**
     * Returns new vector which is multiply of two vectors
     */
    fn multiply_vec(&self, other: &Self) -> Self;

    /**
     * Modify vector with given vector
     */
    fn add_vec_in_place(&mut self, other: &Self);
    fn add_vec_to_ref(&mut self, other: &Self, result: &mut Self);
    fn add_vec(&mut self, other: &Self) -> Self;
    fn divide_vec_in_place(&mut self, other: &Self);
    fn divide_in_place(&mut self, dividor: T);
    fn normalize_in_place(&mut self);
    fn to_scaling_matrix(&self) -> [[T; N]; N];
    fn transform(&self, matrix: [[f32; 4]; 4]) -> Self;
    fn transform_to_ref(&self, matrix: [[f32; 4]; 4], other: &mut Self);
}
pub trait MatrixMath<T> {
    fn identity() -> Self;
    fn determinant(&self) -> T;
    fn invert_in_place(&mut self) -> bool;
    fn invert_to_ref(&self, other: &mut Self) -> bool;
    fn transpose(&mut self);
    fn adjoint(&mut self);
    fn multiply_f32(&mut self, number: T);
    fn multiply(&self, other: &Self, result: &mut Self);
}
impl CrossProduct<f32> for [f32; 3] {
    fn cross(&self, other: &[f32; 3]) -> Self {
        let mut vec = [0.0, 0.0, 0.0];
        self.cross_to_ref(other, &mut vec);
        return vec;
    }
    fn cross_to_ref(&self, other: &[f32; 3], result: &mut [f32; 3]) {
        result[0] = self[1] * other[2] - self[2] * other[1];
        result[1] = self[2] * other[0] - self[0] * other[2];
        result[2] = self[0] * other[1] - self[1] * other[0];
    }
}
impl VectorMath<f32, 3> for [f32; 3] {
    fn dot(&self, other: &[f32; 3]) -> f32 {
        return self[0] * other[0] + self[1] * other[1] + self[2] * other[2];
    }
    fn min(&self, other: &[f32; 3]) -> [f32; 3] {
        [
            self[0].min(other[0]),
            self[1].min(other[1]),
            self[2].min(other[2]),
        ]
    }
    fn max(&self, other: &[f32; 3]) -> [f32; 3] {
        [
            self[0].max(other[0]),
            self[1].max(other[1]),
            self[2].max(other[2]),
        ]
    }
    fn get_min(&self) -> f32 {
        self[0].min(self[1].min(self[2]))
    }
    fn get_max(&self) -> f32 {
        self[0].max(self[1].max(self[2]))
    }
    fn clear(&mut self) {
        self[0] = 0.0;
        self[1] = 0.0;
        self[2] = 0.0;
    }
    fn sub_vec(&self, other: &Self) -> Self {
        [self[0] - other[0], self[1] - other[1], self[2] - other[2]]
    }
    fn multiply(&mut self, multiplier: f32) -> Self {
        [
            self[0] * multiplier,
            self[1] * multiplier,
            self[2] * multiplier,
        ]
    }
    fn multiply_in_place(&mut self, multiplier: f32) {
        self[0] *= multiplier;
        self[1] *= multiplier;
        self[2] *= multiplier;
    }
    fn multiply_vec(&self, other: &Self) -> Self {
        [self[0] * other[0], self[1] * other[1], self[2] * other[2]]
    }
    fn add_vec_in_place(&mut self, other: &Self) {
        self[0] += other[0];
        self[1] += other[1];
        self[2] += other[2];
    }
    fn add_vec_to_ref(&mut self, other: &Self, result: &mut Self) {
        result[0] = self[0] + other[0];
        result[1] = self[1] + other[1];
        result[2] = self[2] + other[2];
    }
    fn add_vec(&mut self, other: &Self) -> Self {
        [self[0] + other[0], self[1] + other[1], self[2] + other[2]]
    }
    fn divide_vec_in_place(&mut self, other: &Self) {
        self[0] /= other[0];
        self[1] /= other[1];
        self[2] /= other[2];
    }
    fn divide_in_place(&mut self, dividor: f32) {
        self[0] /= dividor;
        self[1] /= dividor;
        self[2] /= dividor;
    }
    fn normalize_in_place(&mut self) {
        let len_sqrt = self[0] * self[0] + self[1] * self[1] + self[2] * self[2];
        if len_sqrt == 0.0 || len_sqrt == 1.0 {
            return;
        }
        let scale = 1.0 / len_sqrt.sqrt();
        self.multiply_in_place(scale);
    }
    fn to_scaling_matrix(&self) -> [[f32; 3]; 3] {
        [
            [self[0], 0.0, 0.0],
            [0.0, self[1], 0.0],
            [0.0, 0.0, self[2]],
        ]
    }
    fn transform(&self, matrix: [[f32; 4]; 4]) -> Self {
        let mut result = [0.0; 3];
        self.transform_to_ref(matrix, &mut result);
        return result;
    }
    #[cfg(not(target_arch = "wasm32"))]
    fn transform_to_ref(&self, matrix: [[f32; 4]; 4], other: &mut Self) {
        let rx =
            self[0] * matrix[0][0] + self[1] * matrix[1][0] + self[2] * matrix[2][0] + matrix[3][0];
        let ry =
            self[0] * matrix[0][1] + self[1] * matrix[1][1] + self[2] * matrix[2][1] + matrix[3][1];
        let rz =
            self[0] * matrix[0][2] + self[1] * matrix[1][2] + self[2] * matrix[2][2] + matrix[3][2];
        let rw = 1.0
            / (self[0] * matrix[0][3]
                + self[1] * matrix[1][3]
                + self[2] * matrix[2][3]
                + matrix[3][3]);
        other[0] = rx * rw;
        other[1] = ry * rw;
        other[2] = rz * rw;
    }
    #[cfg(target_arch = "wasm32")]
    fn transform_to_ref(&self, matrix: [[f32; 4]; 4], other: &mut Self) {
        use std::arch::wasm32::{
            f32x4_add, f32x4_extract_lane, f32x4_mul, f32x4_splat, v128, v128_load,
        };

        let r0 = unsafe { v128_load(&matrix[0] as *const f32 as *const v128) };
        let r1 = unsafe { v128_load(&matrix[1] as *const f32 as *const v128) };
        let r2 = unsafe { v128_load(&matrix[2] as *const f32 as *const v128) };
        let r3 = unsafe { v128_load(&matrix[3] as *const f32 as *const v128) };
        let rows = f32x4_add(
            f32x4_add(
                f32x4_add(
                    f32x4_mul(r0, f32x4_splat(self[0])),
                    f32x4_mul(r1, f32x4_splat(self[1])),
                ),
                f32x4_mul(r2, f32x4_splat(self[2])),
            ),
            r3,
        );
        let rx = f32x4_extract_lane::<0>(rows);
        let ry = f32x4_extract_lane::<1>(rows);
        let rz = f32x4_extract_lane::<2>(rows);
        let rw = 1.0 / f32x4_extract_lane::<3>(rows);
        other[0] = rx * rw;
        other[1] = ry * rw;
        other[2] = rz * rw;
    }
}
impl VectorMath<f32, 4> for [f32; 4] {
    fn dot(&self, other: &Self) -> f32 {
        self[0] * other[0] + self[1] * other[1] + self[2] * other[2] + self[3] * other[3]
    }
    fn min(&self, other: &Self) -> Self {
        #[cfg(not(target_arch = "wasm32"))]
        {
            [
                self[0].min(other[0]),
                self[1].min(other[1]),
                self[2].min(other[2]),
                self[3].min(other[3]),
            ]
        }
        #[cfg(target_arch = "wasm32")]
        unsafe {
            use std::arch::wasm32::{f32x4_pmin, v128, v128_load};
            let v0 = v128_load(self as *const [f32; 4] as *const v128);
            let v1 = v128_load(other as *const [f32; 4] as *const v128);
            let res = f32x4_pmin(v0, v1);
            return std::mem::transmute::<v128, [f32; 4]>(res);
        }
    }
    fn max(&self, other: &Self) -> Self {
        #[cfg(not(target_arch = "wasm32"))]
        {
            [
                self[0].max(other[0]),
                self[1].max(other[1]),
                self[2].max(other[2]),
                self[3].max(other[3]),
            ]
        }
        #[cfg(target_arch = "wasm32")]
        unsafe {
            use std::arch::wasm32::{f32x4_pmax, v128, v128_load};
            let v0 = v128_load(self as *const [f32; 4] as *const v128);
            let v1 = v128_load(other as *const [f32; 4] as *const v128);
            let res = f32x4_pmax(v0, v1);
            return std::mem::transmute::<v128, [f32; 4]>(res);
        }
    }
    fn get_min(&self) -> f32 {
        self[0].min(self[1].min(self[2].min(self[3])))
    }
    fn get_max(&self) -> f32 {
        self[0].max(self[1].max(self[2].max(self[3])))
    }
    fn clear(&mut self) {
        self[0] = 0.0;
        self[1] = 0.0;
        self[2] = 0.0;
        self[3] = 0.0;
    }
    fn sub_vec(&self, other: &Self) -> Self {
        [
            self[0] - other[0],
            self[1] - other[1],
            self[2] - other[2],
            self[3] - other[3],
        ]
    }
    fn multiply(&mut self, multiplier: f32) -> Self {
        [
            self[0] * multiplier,
            self[1] * multiplier,
            self[2] * multiplier,
            self[3] * multiplier,
        ]
    }
    fn multiply_in_place(&mut self, multiplier: f32) {
        self[0] *= multiplier;
        self[1] *= multiplier;
        self[2] *= multiplier;
        self[3] *= multiplier;
    }
    fn multiply_vec(&self, other: &Self) -> Self {
        [
            self[0] * other[0],
            self[1] * other[1],
            self[2] * other[2],
            self[3] * other[3],
        ]
    }
    fn add_vec_in_place(&mut self, other: &Self) {
        self[0] = self[0] + other[0];
        self[1] = self[1] + other[1];
        self[2] = self[2] + other[2];
        self[3] = self[3] + other[3];
    }
    fn add_vec_to_ref(&mut self, other: &Self, result: &mut Self) {
        result[0] = self[0] + other[0];
        result[1] = self[1] + other[1];
        result[2] = self[2] + other[2];
        result[3] = self[3] + other[3];
    }
    fn add_vec(&mut self, other: &Self) -> Self {
        [
            self[0] + other[0],
            self[1] + other[1],
            self[2] + other[2],
            self[3] + other[3],
        ]
    }
    fn divide_vec_in_place(&mut self, other: &Self) {
        self[0] /= other[0];
        self[1] /= other[1];
        self[2] /= other[2];
        self[3] /= other[3];
    }
    fn divide_in_place(&mut self, dividor: f32) {
        self[0] /= dividor;
        self[1] /= dividor;
        self[2] /= dividor;
        self[3] /= dividor;
    }
    fn normalize_in_place(&mut self) {
        let len_sqrt =
            self[0] * self[0] + self[1] * self[1] + self[2] * self[2] + self[3] * self[3];
        if len_sqrt == 0.0 || len_sqrt == 1.0 {
            return;
        }
        let scale = 1.0 / len_sqrt.sqrt();
        self[0] *= scale;
        self[1] *= scale;
        self[2] *= scale;
        self[3] *= scale;
    }
    fn to_scaling_matrix(&self) -> [[f32; 4]; 4] {
        [
            [self[0], 0.0, 0.0, 0.0],
            [0.0, self[1], 0.0, 0.0],
            [0.0, 0.0, self[2], 0.0],
            [0.0, 0.0, 0.0, 1.0],
        ]
    }

    fn transform(&self, _matrix: [[f32; 4]; 4]) -> Self {
        todo!()
    }

    fn transform_to_ref(&self, _matrix: [[f32; 4]; 4], other: &mut Self) {
        todo!()
    }
}

impl MatrixMath<f32> for [[f32; 2]; 2] {
    fn identity() -> Self {
        [[1.0, 0.0], [0.0, 1.0]]
    }
    fn multiply_f32(&mut self, number: f32) {
        #[cfg(not(target_arch = "wasm32"))]
        {
            self[0][0] = self[0][0] * number;
            self[0][1] = self[0][1] * number;
            self[1][0] = self[1][0] * number;
            self[1][1] = self[1][1] * number;
        }
        #[cfg(target_arch = "wasm32")]
        {
            unsafe {
                use std::arch::wasm32::{f32x4_mul, f32x4_splat, v128, v128_load, v128_store};
                let ptr = &mut self[0] as *mut [f32; 2] as *mut v128;
                let matrix = v128_load(ptr);
                let multiplier_vec = f32x4_splat(number);
                v128_store(ptr, f32x4_mul(matrix, multiplier_vec))
            }
        }
    }
    fn multiply(&self, _other: &Self, _result: &mut Self) {
        panic!("Not implemented");
    }
    fn determinant(&self) -> f32 {
        self[0][0].mul_add(self[1][1], self[0][1] * -self[1][0])
    }
    fn transpose(&mut self) {
        unsafe {
            let arr = &mut *(self[0].as_mut_ptr() as *mut [f32; 4]);
            arr.swap(1, 2);
        }
    }
    fn adjoint(&mut self) {
        #[cfg(not(target_arch = "wasm32"))]
        {
            unsafe {
                let arr = &mut *(self[0].as_mut_ptr() as *mut [f32; 4]);
                arr.swap(0, 3);
            }
            self[0][1] = -self[0][1];
            self[1][0] = -self[1][0];
        }
        #[cfg(target_arch = "wasm32")]
        {
            use std::arch::wasm32::{f32x4_neg, i32x4_shuffle, v128, v128_load, v128_store};
            let ptr = &mut self[0] as *mut [f32; 2] as *mut v128;
            unsafe {
                let matrix = v128_load(ptr);
                let matrix_neg = f32x4_neg(matrix);
                let adjoint = i32x4_shuffle::<3, 5, 6, 0>(matrix, matrix_neg);
                v128_store(ptr, adjoint);
            }
        }
    }
    fn invert_in_place(&mut self) -> bool {
        let determinant = self.determinant();
        if determinant == 0.0 {
            return false;
        }
        self.adjoint();
        self.multiply_f32(1.0 / determinant);
        return true;
    }

    fn invert_to_ref(&self, _other: &mut Self) -> bool {
        todo!()
    }
}

impl MatrixMath<f32> for [[f32; 3]; 3] {
    fn identity() -> Self {
        [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]
    }
    fn multiply_f32(&mut self, number: f32) {
        self[0][0] = self[0][0] * number;
        self[0][1] = self[0][1] * number;
        self[0][2] = self[0][2] * number;
        self[1][0] = self[1][0] * number;
        self[1][1] = self[1][1] * number;
        self[1][2] = self[1][2] * number;
        self[2][0] = self[2][0] * number;
        self[2][1] = self[2][1] * number;
        self[2][2] = self[2][2] * number;
    }
    fn multiply(&self, _other: &Self, _result: &mut Self) {
        panic!("not implemented");
    }
    fn determinant(&self) -> f32 {
        let mut crossed = [0.0; 3];
        self[0].cross_to_ref(&self[1], &mut crossed);
        self[2].dot(&crossed)
    }
    fn transpose(&mut self) {
        unsafe {
            let arr = &mut *(self[0].as_mut_ptr() as *mut [f32; 9]);
            arr.swap(1, 3);
            arr.swap(2, 6);
            arr.swap(5, 7);
        }
    }
    fn adjoint(&mut self) {
        // Submatrices of transported matrix
        /*
           _ _ _
           _ x y
           _ x y
        */
        let m0 = [[self[1][1], self[2][1]], [self[1][2], self[2][2]]];
        /*
           _ x y
           _ _ _
           _ x y
        */
        let m1 = [[self[0][1], self[2][1]], [self[0][2], self[2][2]]];
        /*
           _ x y
           _ x y
           _ _ _
        */
        let m2 = [[self[0][1], self[1][1]], [self[0][2], self[1][2]]];
        /*
           _ _ _
           x _ y
           x _ y
        */
        let m3 = [[self[1][0], self[2][0]], [self[1][2], self[2][2]]];
        /*
           x _ y
           _ _ _
           x _ y
        */
        let m4 = [[self[0][0], self[2][0]], [self[0][2], self[2][2]]];
        /*
           x _ y
           x _ y
           _ _ _
        */
        let m5 = [[self[0][0], self[1][0]], [self[0][2], self[1][2]]];
        /*
           _ _ _
           x y _
           x y _
        */
        let m6 = [[self[1][0], self[2][0]], [self[1][1], self[2][1]]];
        /*
           x y _
           _ _ _
           x y _
        */
        let m7 = [[self[0][0], self[2][0]], [self[0][1], self[2][1]]];
        /*
           x y _
           x y _
           _ _ _
        */
        let m8 = [[self[0][0], self[1][0]], [self[0][1], self[1][1]]];

        self[0][0] = m0.determinant();
        self[0][1] = -m1.determinant();
        self[0][2] = m2.determinant();
        self[1][0] = -m3.determinant();
        self[1][1] = m4.determinant();
        self[1][2] = -m5.determinant();
        self[2][0] = m6.determinant();
        self[2][1] = -m7.determinant();
        self[2][2] = m8.determinant();
    }
    fn invert_in_place(&mut self) -> bool {
        // Submatrices of transported matrix
        let m0 = [[self[1][1], self[2][1]], [self[1][2], self[2][2]]];
        let m1 = [[self[0][1], self[2][1]], [self[0][2], self[2][2]]];
        let m2 = [[self[0][1], self[1][1]], [self[0][2], self[1][2]]];

        let det0 = m0.determinant();
        let det1 = m1.determinant();
        let det2 = m2.determinant();

        let m_det: f32 = self[2][0].mul_add(det2, self[0][0].mul_add(det0, -self[1][0] * det1));

        if m_det == 0.0 {
            return false;
        }
        let m3 = [[self[1][0], self[2][0]], [self[1][2], self[2][2]]];
        let m4 = [[self[0][0], self[2][0]], [self[0][2], self[2][2]]];
        let m5 = [[self[0][0], self[1][0]], [self[0][2], self[1][2]]];

        let m6 = [[self[1][0], self[2][0]], [self[1][1], self[2][1]]];
        let m7 = [[self[0][0], self[2][0]], [self[0][1], self[2][1]]];
        let m8 = [[self[0][0], self[1][0]], [self[0][1], self[1][1]]];

        self[0][0] = det0;
        self[0][1] = -det1;
        self[0][2] = det2;
        self[1][0] = -m3.determinant();
        self[1][1] = m4.determinant();
        self[1][2] = -m5.determinant();
        self[2][0] = m6.determinant();
        self[2][1] = -m7.determinant();
        self[2][2] = m8.determinant();

        self.multiply_f32(1.0 / m_det);

        return true;
    }

    fn invert_to_ref(&self, _other: &mut Self) -> bool {
        todo!()
    }
}

impl MatrixMath<f32> for [[f32; 4]; 4] {
    fn identity() -> Self {
        [
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0],
        ]
    }
    fn multiply_f32(&mut self, number: f32) {
        self[0][0] = self[0][0] * number;
        self[0][1] = self[0][1] * number;
        self[0][2] = self[0][2] * number;
        self[0][3] = self[0][3] * number;
        self[1][0] = self[1][0] * number;
        self[1][1] = self[1][1] * number;
        self[1][2] = self[1][2] * number;
        self[1][3] = self[1][3] * number;
        self[2][0] = self[2][0] * number;
        self[2][1] = self[2][1] * number;
        self[2][2] = self[2][2] * number;
        self[2][3] = self[2][3] * number;
        self[3][0] = self[3][0] * number;
        self[3][1] = self[3][1] * number;
        self[3][2] = self[3][2] * number;
        self[3][3] = self[3][3] * number;
    }
    #[cfg(not(target_arch = "wasm32"))]
    fn multiply(&self, other: &Self, result: &mut Self) {
        result[0][0] = self[0][0] * other[0][0]
            + self[0][1] * other[1][0]
            + self[0][2] * other[2][0]
            + self[0][3] * other[3][0];
        result[0][1] = self[0][0] * other[0][1]
            + self[0][1] * other[1][1]
            + self[0][2] * other[2][1]
            + self[0][3] * other[3][1];
        result[0][2] = self[0][0] * other[0][2]
            + self[0][1] * other[1][2]
            + self[0][2] * other[2][2]
            + self[0][3] * other[3][2];
        result[0][3] = self[0][0] * other[0][3]
            + self[0][1] * other[1][3]
            + self[0][2] * other[2][3]
            + self[0][3] * other[3][3];

        result[1][0] = self[1][0] * other[0][0]
            + self[1][1] * other[1][0]
            + self[1][2] * other[2][0]
            + self[1][3] * other[3][0];
        result[1][1] = self[1][0] * other[0][1]
            + self[1][1] * other[1][1]
            + self[1][2] * other[2][1]
            + self[1][3] * other[3][1];
        result[1][2] = self[1][0] * other[0][2]
            + self[1][1] * other[1][2]
            + self[1][2] * other[2][2]
            + self[1][3] * other[3][2];
        result[1][3] = self[1][0] * other[0][3]
            + self[1][1] * other[1][3]
            + self[1][2] * other[2][3]
            + self[1][3] * other[3][3];

        result[2][0] = self[2][0] * other[0][0]
            + self[2][1] * other[1][0]
            + self[2][2] * other[2][0]
            + self[2][3] * other[3][0];
        result[2][1] = self[2][0] * other[0][1]
            + self[2][1] * other[1][1]
            + self[2][2] * other[2][1]
            + self[2][3] * other[3][1];
        result[2][2] = self[2][0] * other[0][2]
            + self[2][1] * other[1][2]
            + self[2][2] * other[2][2]
            + self[2][3] * other[3][2];
        result[2][3] = self[2][0] * other[0][3]
            + self[2][1] * other[1][3]
            + self[2][2] * other[2][3]
            + self[2][3] * other[3][3];

        result[3][0] = self[3][0] * other[0][0]
            + self[3][1] * other[1][0]
            + self[3][2] * other[2][0]
            + self[3][3] * other[3][0];
        result[3][1] = self[3][0] * other[0][1]
            + self[3][1] * other[1][1]
            + self[3][2] * other[2][1]
            + self[3][3] * other[3][1];
        result[3][2] = self[3][0] * other[0][2]
            + self[3][1] * other[1][2]
            + self[3][2] * other[2][2]
            + self[3][3] * other[3][2];
        result[3][3] = self[3][0] * other[0][3]
            + self[3][1] * other[1][3]
            + self[3][2] * other[2][3]
            + self[3][3] * other[3][3];
    }
    /**
    Multiply matrix with other matrix.
    To multiply matrix in place, use std::ptr::addr_of! macro to give original pointer
    */
    #[cfg(target_arch = "wasm32")]
    fn multiply(&self, other: &Self, result: &mut Self) {
        unsafe {
            use std::arch::wasm32::*;

            let v0 = v128_load(&other[0] as *const f32 as *const v128);
            let v1 = v128_load(&other[1] as *const f32 as *const v128);
            let v2 = v128_load(&other[2] as *const f32 as *const v128);
            let v3 = v128_load(&other[3] as *const f32 as *const v128);

            v128_store(
                &mut result[0] as *mut f32 as *mut v128,
                f32x4_add(
                    f32x4_add(
                        f32x4_mul(f32x4_splat(self[0][0]), v0),
                        f32x4_mul(f32x4_splat(self[0][1]), v1),
                    ),
                    f32x4_add(
                        f32x4_mul(f32x4_splat(self[0][2]), v2),
                        f32x4_mul(f32x4_splat(self[0][3]), v3),
                    ),
                ),
            );
            v128_store(
                &mut result[1] as *mut f32 as *mut v128,
                f32x4_add(
                    f32x4_add(
                        f32x4_mul(f32x4_splat(self[1][0]), v0),
                        f32x4_mul(f32x4_splat(self[1][1]), v1),
                    ),
                    f32x4_add(
                        f32x4_mul(f32x4_splat(self[1][2]), v2),
                        f32x4_mul(f32x4_splat(self[1][3]), v3),
                    ),
                ),
            );
            v128_store(
                &mut result[2] as *mut f32 as *mut v128,
                f32x4_add(
                    f32x4_add(
                        f32x4_mul(f32x4_splat(self[2][0]), v0),
                        f32x4_mul(f32x4_splat(self[2][1]), v1),
                    ),
                    f32x4_add(
                        f32x4_mul(f32x4_splat(self[2][2]), v2),
                        f32x4_mul(f32x4_splat(self[2][3]), v3),
                    ),
                ),
            );
            v128_store(
                &mut result[3] as *mut f32 as *mut v128,
                f32x4_add(
                    f32x4_add(
                        f32x4_mul(f32x4_splat(self[3][0]), v0),
                        f32x4_mul(f32x4_splat(self[3][1]), v1),
                    ),
                    f32x4_add(
                        f32x4_mul(f32x4_splat(self[3][2]), v2),
                        f32x4_mul(f32x4_splat(self[3][3]), v3),
                    ),
                ),
            )
        }
    }
    fn determinant(&self) -> f32 {
        // Submatrices of transported matrix
        /*
         *  _ _ _ _
         *  _ x y z
         *  _ x y z
         *  _ x y z
         */
        let m0 = [
            [self[1][1], self[2][1], self[3][1]],
            [self[1][2], self[2][2], self[3][2]],
            [self[1][3], self[2][3], self[3][3]],
        ];
        /*
         *  _ x y z
         *  _ _ _ _
         *  _ x y z
         *  _ x y z
         */
        let m1 = [
            [self[0][1], self[2][1], self[3][1]],
            [self[0][2], self[2][2], self[3][2]],
            [self[0][3], self[2][3], self[3][3]],
        ];
        /*
         *  _ x y z
         *  _ x y z
         *  _ _ _ _
         *  _ x y z
         */
        let m2 = [
            [self[0][1], self[1][1], self[3][1]],
            [self[0][2], self[1][2], self[3][2]],
            [self[0][3], self[1][3], self[3][3]],
        ];
        /*
         *  _ x y z
         *  _ x y z
         *  _ x y z
         *  _ _ _ _
         */
        let m3 = [
            [self[0][1], self[1][1], self[2][1]],
            [self[0][2], self[1][2], self[2][2]],
            [self[0][3], self[1][3], self[2][3]],
        ];

        let det0 = m0.determinant();
        let det1 = m1.determinant();
        let det2 = m2.determinant();
        let det3 = m3.determinant();

        let m_det = self[3][0].mul_add(
            -det3,
            self[2][0].mul_add(det2, self[1][0].mul_add(-det1, self[0][0] * det0)),
        );
        return m_det;
    }
    fn adjoint(&mut self) {
        panic!("not implement");
    }
    fn invert_in_place(&mut self) -> bool {
        panic!("not implemented");
    }
    fn transpose(&mut self) {
        panic!("not implemented");
    }

    fn invert_to_ref(&self, other: &mut Self) -> bool {
        let det_22_33 = [[self[2][2], self[2][3]], [self[3][2], self[3][3]]].determinant();
        let det_21_33 = [[self[2][1], self[2][3]], [self[3][1], self[3][3]]].determinant();
        let det_21_32 = [[self[2][1], self[2][2]], [self[3][1], self[3][2]]].determinant();
        let det_20_33 = [[self[2][0], self[2][3]], [self[3][0], self[3][3]]].determinant();
        let det_20_32 = [[self[2][0], self[3][0]], [self[2][2], self[3][2]]].determinant();
        let det_20_31 = [[self[2][0], self[2][1]], [self[3][0], self[3][1]]].determinant();

        let cofact_00 = self[1][1] * det_22_33 - self[1][2] * det_21_33 + self[1][3] * det_21_32;
        let cofact_01 = -(self[1][0] * det_22_33 - self[1][2] * det_20_33 + self[1][3] * det_20_32);
        let cofact_02 = self[1][0] * det_21_33 - self[1][1] * det_20_33 + self[1][3] * det_20_31;
        let cofact_03 = -(self[1][0] * det_21_32 - self[1][1] * det_20_32 + self[1][2] * det_20_31);

        let m_det = self[0][0] * cofact_00
            + self[0][1] * cofact_01
            + self[0][2] * cofact_02
            + self[0][3] * cofact_03;

        if m_det == 0.0 {
            return false;
        }

        let det_12_33 = self[1][2] * self[3][3] - self[3][2] * self[1][3];
        let det_11_33 = self[1][1] * self[3][3] - self[3][1] * self[1][3];
        let det_11_32 = self[1][1] * self[3][2] - self[3][1] * self[1][2];
        let det_10_33 = self[1][0] * self[3][3] - self[3][0] * self[1][3];
        let det_10_32 = self[1][0] * self[3][2] - self[3][0] * self[1][2];
        let det_10_31 = self[1][0] * self[3][1] - self[3][0] * self[1][1];
        let det_12_23 = self[1][2] * self[2][3] - self[2][2] * self[1][3];
        let det_11_23 = self[1][1] * self[2][3] - self[2][1] * self[1][3];
        let det_11_22 = self[1][1] * self[2][2] - self[2][1] * self[1][2];
        let det_10_23 = self[1][0] * self[2][3] - self[2][0] * self[1][3];
        let det_10_22 = self[1][0] * self[2][2] - self[2][0] * self[1][2];
        let det_10_21 = self[1][0] * self[2][1] - self[2][0] * self[1][1];

        let cofact_10 = -(self[0][1] * det_22_33 - self[0][2] * det_21_33 + self[0][3] * det_21_32);
        let cofact_11 = self[0][0] * det_22_33 - self[0][2] * det_20_33 + self[0][3] * det_20_32;
        let cofact_12 = -(self[0][0] * det_21_33 - self[0][1] * det_20_33 + self[0][3] * det_20_31);
        let cofact_13 = self[0][0] * det_21_32 - self[0][1] * det_20_32 + self[0][2] * det_20_31;

        let cofact_20 = self[0][1] * det_12_33 - self[0][2] * det_11_33 + self[0][3] * det_11_32;
        let cofact_21 = -(self[0][0] * det_12_33 - self[0][2] * det_10_33 + self[0][3] * det_10_32);
        let cofact_22 = self[0][0] * det_11_33 - self[0][1] * det_10_33 + self[0][3] * det_10_31;
        let cofact_23 = -(self[0][0] * det_11_32 - self[0][1] * det_10_32 + self[0][2] * det_10_31);

        let cofact_30 = -(self[0][1] * det_12_23 - self[0][2] * det_11_23 + self[0][3] * det_11_22);
        let cofact_31 = self[0][0] * det_12_23 - self[0][2] * det_10_23 + self[0][3] * det_10_22;
        let cofact_32 = -(self[0][0] * det_11_23 - self[0][1] * det_10_23 + self[0][3] * det_10_21);
        let cofact_33 = self[0][0] * det_11_22 - self[0][1] * det_10_22 + self[0][2] * det_10_21;

        other[0][0] = cofact_00;
        other[0][1] = cofact_10;
        other[0][2] = cofact_20;
        other[0][3] = cofact_30;
        other[1][0] = cofact_01;
        other[1][1] = cofact_11;
        other[1][2] = cofact_21;
        other[1][3] = cofact_31;
        other[2][0] = cofact_02;
        other[2][1] = cofact_12;
        other[2][2] = cofact_22;
        other[2][3] = cofact_32;
        other[3][0] = cofact_03;
        other[3][1] = cofact_13;
        other[3][2] = cofact_23;
        other[3][3] = cofact_33;
        other.multiply_f32(1.0 / m_det);

        return true;
    }
}
#[cfg(test)]
#[test]
fn test_determinant_3x3() {
    let mat = [[2.0, -3.0, 1.0], [2.0, 0.0, -1.0], [1.0, 4.0, 5.0]];
    assert_eq!(mat.determinant(), 49.0);
}
#[cfg(test)]
#[test]
fn test_determinant_4x4() {
    let mat = [
        [-1.1, 0.2, 1.3, 2.4],
        [5.4, 6.5, 7.6, 8.7],
        [1.1, 2.2, 3.3, 4.4],
        [12.4, 3.5, 4.1, 3.5],
    ];
    assert_eq!(mat.determinant(), 1.1352408);
}
#[cfg(test)]
#[test]
#[wasm_bindgen_test::wasm_bindgen_test]
fn test_transpose() {
    let mut mat: [[f32; 3]; 3] = [[1.0, 2.0, 3.0], [0.0, 1.745, 4.0], [5.0, 6.0, -43.4]];
    mat.transpose();
    assert_eq!(mat, [[1.0, 0.0, 5.0], [2.0, 1.745, 6.0], [3.0, 4.0, -43.4]]);
}

#[cfg(test)]
#[test]
#[wasm_bindgen_test::wasm_bindgen_test]
fn test_adjoint() {
    let mut mat: [[f32; 3]; 3] = [[1.0, 2.0, 3.0], [0.0, 1.0, 4.0], [5.0, 6.0, 0.0]];
    mat.adjoint();
    assert_eq!(
        mat,
        [[-24.0, 18.0, 5.0], [20.0, -15.0, -4.0], [-5.0, 4.0, 1.0]]
    );

    let mut mat2: [[f32; 2]; 2] = [[3.0, 2.0], [1.0, 5.0]];
    mat2.adjoint();
    assert_eq!(mat2, [[5.0, -2.0], [-1.0, 3.0]]);
}

#[cfg(test)]
#[test]
#[wasm_bindgen_test::wasm_bindgen_test]
fn test_invert() {
    let mut mat: [[f32; 3]; 3] = [[4.0, 2.0, 3.0], [-1.354, 3.234, -34.42], [5.0, 6.0, 8.0]];
    mat.invert_in_place();
    assert_eq!(
        mat,
        [
            [0.43506882, 0.003744267, -0.1470411],
            [-0.3019152, 0.03182627, 0.2501507],
            [-0.04548161, -0.026209868, 0.029287657]
        ]
    );
    let mat2: [[f32; 4]; 4] = [
        [4.0, 2.0, 3.0, 5.5],
        [-1.354, 3.234, -34.42, 54.7],
        [5.0, 6.0, 8.0, -45.6],
        [-43.0, 8.0, -4.0, -435.6],
    ];
    let mut res = [[0.0; 4]; 4];
    assert_eq!(mat2.invert_to_ref(&mut res), true);
    assert_eq!(
        res,
        [
            [-4.100362, 0.04672327, 1.6303737, -0.21657774],
            [5.220164, -0.020502476, -1.913927, 0.2636926],
            [1.4265577, -0.040159337, -0.5475979, 0.07029342],
            [0.48753586, -0.004620027, -0.19106312, 0.02328101]
        ]
    );
}

#[cfg(test)]
#[test]
#[wasm_bindgen_test::wasm_bindgen_test]
fn test_multiply() {
    let mat: [[f32; 4]; 4] = [
        [4.0, 2.0, 3.0, 5.5],
        [-1.354, 3.234, -34.42, 54.7],
        [5.0, 6.0, 8.0, -45.6],
        [-43.0, 8.0, -4.0, -435.6],
    ];
    let mat2: [[f32; 4]; 4] = [
        [4.0, 2.0, 3.0, 5.5],
        [-1.354, 3.234, -34.42, 54.7],
        [5.0, 6.0, 8.0, -45.6],
        [-43.0, 8.0, -4.0, -435.6],
    ];
    let mut res = [[0.0; 4]; 4];
    mat.multiply(&mat2, &mut res);
    assert_eq!(
        res,
        [
            [-208.20801, 76.468, -54.839996, -2401.2002],
            [-2533.995, 238.83078, -609.53625, -22088.314],
            [2012.6759, -287.396, 54.880005, 19854.258],
            [18527.969, -3568.928, 1306.04, 190130.86]
        ]
    );
}
