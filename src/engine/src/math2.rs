#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::*;

#[derive(Copy, Clone)]
pub struct Vec3<T> {
    pub x: T,
    pub y: T,
    pub z: T,
}
#[repr(C, align(16))]
#[derive(Copy, Clone)]
pub struct Vec3F32 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}
impl Vec3<f32> {
    pub fn to_scaling_matrix(&self) -> Vec4<Vec4<f32>> {
        Vec4 {
            x: Vec4 { x: self.x, y: 0.0, z: 0.0, w: 0.0 },
            y: Vec4 { x: 0.0, y: self.y, z: 0.0, w: 0.0 },
            z: Vec4 { x: 0.0, y: 0.0, z: self.z, w: 0.0 },
            w: Vec4 { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
        }
    }
    pub fn to_translation_matrix(&self) -> Vec4<Vec4<f32>> {
        Vec4 {
            x: Vec4 { x: 1.0, y: 0.0, z: 0.0, w: 0.0 },
            y: Vec4 { x: 0.0, y: 1.0, z: 0.0, w: 0.0 },
            z: Vec4 { x: 0.0, y: 0.0, z: 1.0, w: 0.0 },
            w: Vec4 { x: self.x, y: self.y, z: self.z, w: 1.0 }
        }
    }
}
impl Vec3F32 {
    pub fn transform_to_ref(&self, m: &Vec4<Vec4<f32>>, other: &mut Vec3F32) {
        let rx = self.x * m.x.x + self.y * m.y.x + self.z * m.z.x + m.w.x;
        let ry = self.x * m.x.y + self.y * m.y.y + self.z * m.z.y + m.w.y;
        let rz = self.x * m.x.z + self.y * m.y.z + self.z * m.z.z + m.w.z;
        let rw = 1.0 / (self.x * m.x.w + self.y * m.y.w + self.z * m.y.w + m.w.w);
        other.x = rx * rw;
        other.y = ry * rw;
        other.z = rz * rw;
    }
}

impl Vec4<Vec4<f32>> {
    #[cfg(not(target_arch = "wasm32"))]
    pub unsafe fn multiply(&self, other:&Vec4<Vec4<f32>>, result:&mut Vec4<Vec4<f32>>) {
        result.x.x = self.x.x * other.x.x + self.x.y * other.y.x + self.x.z * other.z.x + self.x.w * other.w.x;
        result.x.y = self.x.x * other.x.y + self.x.y * other.y.y + self.x.z * other.z.y + self.x.w * other.w.y;
        result.x.z = self.x.x * other.x.z + self.x.y * other.y.z + self.x.z * other.z.z + self.x.w * other.w.z;
        result.x.w = self.x.x * other.x.w + self.x.y * other.y.w + self.x.z * other.z.w + self.x.w * other.w.w;

        result.y.x = self.y.x * other.x.x + self.y.y * other.y.x + self.y.z * other.z.x + self.y.w * other.w.x;
        result.y.y = self.y.x * other.x.y + self.y.y * other.y.y + self.y.z * other.z.y + self.y.w * other.w.y;
        result.y.z = self.y.x * other.x.z + self.y.y * other.y.z + self.y.z * other.z.z + self.y.w * other.w.z;
        result.y.w = self.y.x * other.x.w + self.y.y * other.y.w + self.y.z * other.z.w + self.y.w * other.w.w;
  
        result.z.x = self.z.x * other.x.x + self.z.y * other.y.x + self.z.z * other.z.x + self.z.w * other.w.x;
        result.z.y = self.z.x * other.x.y + self.z.y * other.y.y + self.z.z * other.z.y + self.z.w * other.w.y;
        result.z.z = self.z.x * other.x.z + self.z.y * other.y.z + self.z.z * other.z.z + self.z.w * other.w.z;
        result.z.w = self.z.x * other.x.w + self.z.y * other.y.w + self.z.z * other.z.w + self.z.w * other.w.w;
  
        result.w.x = self.w.x * other.x.x + self.w.y * other.y.x + self.w.z * other.z.x + self.w.w * other.w.x;
        result.w.y = self.w.x * other.x.y + self.w.y * other.y.y + self.w.z * other.z.y + self.w.w * other.w.y;
        result.w.z = self.w.x * other.x.z + self.w.y * other.y.z + self.w.z * other.z.z + self.w.w * other.w.z;
        result.w.w = self.w.x * other.x.w + self.w.y * other.y.w + self.w.z * other.z.w + self.w.w * other.w.w;
    }
    #[cfg(target_arch = "wasm32")]
    pub unsafe fn multiply(&self, other:&Vec4<Vec4<f32>>, result:&mut Vec4<Vec4<f32>>) {
        use std::arch::wasm32::*;
        
        let v0 = v128_load(&other.x as *const Vec4<f32> as *const v128);
        let v1 = v128_load(&other.y as *const Vec4<f32> as *const v128);
        let v2 = v128_load(&other.z as *const Vec4<f32> as *const v128);
        let v3 = v128_load(&other.w as *const Vec4<f32> as *const v128);

        v128_store(&mut result.x as *mut Vec4<f32> as *mut v128,
            f32x4_add(
                f32x4_add(
                    f32x4_mul(f32x4_splat(self.x.x), v0),
                    f32x4_mul(f32x4_splat(self.x.y), v1)
                ),
                f32x4_add(
                    f32x4_mul(f32x4_splat(self.x.z), v2),
                    f32x4_mul(f32x4_splat(self.x.w), v3)
                )
            )
        );
        v128_store(&mut result.y as *mut Vec4<f32> as *mut v128,
            f32x4_add(
                f32x4_add(
                    f32x4_mul(f32x4_splat(self.y.x), v0),
                    f32x4_mul(f32x4_splat(self.y.y), v1)
                ),
                f32x4_add(
                    f32x4_mul(f32x4_splat(self.y.z), v2),
                    f32x4_mul(f32x4_splat(self.y.w), v3)
                )
            )
        );
        v128_store(&mut result.z as *mut Vec4<f32> as *mut v128,
            f32x4_add(
                f32x4_add(
                    f32x4_mul(f32x4_splat(self.z.x), v0),
                    f32x4_mul(f32x4_splat(self.z.y), v1)
                ),
                f32x4_add(
                    f32x4_mul(f32x4_splat(self.z.z), v2),
                    f32x4_mul(f32x4_splat(self.z.w), v3)
                )
            )
        );
        v128_store(&mut result.w as *mut Vec4<f32> as *mut v128,
            f32x4_add(
                f32x4_add(
                    f32x4_mul(f32x4_splat(self.w.x), v0),
                    f32x4_mul(f32x4_splat(self.w.y), v1)
                ),
                f32x4_add(
                    f32x4_mul(f32x4_splat(self.w.z), v2),
                    f32x4_mul(f32x4_splat(self.w.w), v3)
                )
            )
        )
    }
}

#[derive(Copy, Clone)]
pub struct Vec4<T> {
    pub x: T,
    pub y: T,
    pub z: T,
    pub w: T,
}
impl Vec4<f32> {
    pub fn get_min(&self) -> f32 {
        self.x.min(self.y.min(self.z.min(self.w)))
    }
    pub fn get_max(&self) -> f32 {
        self.x.max(self.y.max(self.z.max(self.w)))
    }
    #[cfg(not(target_arch = "wasm32"))]
    pub fn min(&self, other: &Vec4<f32>) -> Vec4<f32> {
        Vec4 {
            x:self.x.min(other.x),
            y:self.y.min(other.y),
            z:self.z.min(other.z),
            w:self.w.min(other.w)
        }
    }
    #[cfg(not(target_arch = "wasm32"))]
    pub fn max(&self, other: &Vec4<f32>) -> Vec4<f32> {
        Vec4 {
            x:self.x.max(other.x),
            y:self.y.max(other.y),
            z:self.z.max(other.z),
            w:self.w.max(other.w)
        }
    }
    #[cfg(target_arch = "wasm32")]
    pub fn min(&self, other: &Vec4<f32>) -> Vec4<f32> {
        unsafe {
            let v0 = v128_load(self as *const Vec4<f32> as *const v128);
            let v1 = v128_load(other as *const Vec4<f32> as *const v128);
            let res= f32x4_pmin(v0, v1);
            return std::mem::transmute::<v128, Vec4<f32>>(res);
        }
    }
    #[cfg(target_arch = "wasm32")]
    pub fn max(&self, other: &Vec4<f32>) -> Vec4<f32> {
        unsafe {
            let v0 = v128_load(self as *const Vec4<f32> as *const v128);
            let v1 = v128_load(other as *const Vec4<f32> as *const v128);
            let res= f32x4_pmax(v0, v1);
            return std::mem::transmute::<v128, Vec4<f32>>(res);
        }
    }
}


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
        let mut result:Vec4<Vec4<f32>>=Vec4 {
            x: Vec4 { x: 0.0, y: 0.0, z: 0.0, w: 0.0 },
            y: Vec4 { x: 0.0, y: 0.0, z: 0.0, w: 0.0 },
            z: Vec4 { x: 0.0, y: 0.0, z: 0.0, w: 0.0 },
            w: Vec4 { x: 0.0, y: 0.0, z: 0.0, w: 0.0 }
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
}