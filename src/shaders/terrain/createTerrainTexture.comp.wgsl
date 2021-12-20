struct Settings {
     size : vec2<u32>;
     bufferSize : vec2<u32>;
     subdivisions : u32;
     heightMinMax : vec2<i32>;
    [[align(32)]] max : vec2<i32>;
     textureSize:vec2<u32>;
};


 struct Plane {
  norm : vec3<f32>;
  d : f32;
};
struct PlaneArray {
  plane : [[stride(16)]] array<Plane>;
};
struct IntArray {
  numbers : [[stride(4)]] array<i32>;
};



fn permute(x:vec3<f32>) -> vec3<f32> {
  return (((x*34.0)+1.0)*x) % vec3<f32>(289.0,289.0,289.0); // OR? 289.0 % ((x*34.0)+1.0)*x;
}

fn snoise(v:vec2<f32>) -> f32 {
  let C:vec4<f32> = vec4<f32>(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  var i:vec2<f32> = floor(v + dot(v, C.yy) );
  let x0:vec2<f32> = v -  i + dot(i, C.xx);

  let i1:vec2<f32> = vec2<f32>(0.0, 1.0);
  if(x0.x > x0.y) {
    let i1:vec2<f32> = vec2<f32>(1.0, 0.0);
  }
  var x12:vec4<f32> = x0.xyxy + C.xxzz;
  x12=vec4<f32>(x12.xy - i1, x12.z, x12.w);
//  x12.xy = x12.xy - i1;
  i = i % vec2<f32>(289.0, 289.0); // or 289 % i ?
  let p:vec3<f32> = permute( permute( i.y + vec3<f32>(0.0, i1.y, 1.0 ))
  + i.x + vec3<f32>(0.0, i1.x, 1.0 ));
  var m:vec3<f32> = max(
      vec3<f32>(0.5,0.5,0.5) - vec3<f32>(dot(x0,x0),
      dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), vec3<f32>(0.0,0.0,0.0));
  m = m*m ;
  m = m*m ;
  let x: vec3<f32> = 2.0 * fract(p * C.www) - 1.0;
  let h: vec3<f32> = abs(x) - 0.5;
  let ox: vec3<f32> = floor(x + 0.5);
  let a0: vec3<f32> = x - ox;
  m = m * (1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h ));
  let g:vec3<f32>=vec3<f32>(a0.x  * x0.x  + h.x  * x0.y,
  a0.yz * x12.xz + h.yz * x12.yw
  );
  
  //g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

[[binding(0), group(0)]] var<uniform> settings : Settings;
[[binding(0), group(1)]] var<storage,read> slopes : IntArray;
[[binding(1), group(1)]] var<storage,read> facet12 : PlaneArray;
[[binding(0), group(2)]] var ground_texture: texture_storage_2d<rgba8unorm,write>;


[[stage(compute), workgroup_size(1)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) {
    let facetSize:u32 = settings.subdivisions * settings.subdivisions; // 250 * 250;

    let cx:i32 = i32(f32(GlobalInvocationID.x) * (f32(settings.size.x)/f32(settings.textureSize.x)) - f32(settings.size.x/u32(2)));
    let cz:i32 = i32(f32(GlobalInvocationID.y) * (f32(settings.size.y)/f32(settings.textureSize.y)) - f32(settings.size.y/u32(2)));

    let col:u32 = u32(floor(f32((cx + settings.max.x) * i32(settings.subdivisions)) / f32(settings.size.x)));
    let row:u32 = u32(floor(- f32((cz + settings.max.y) * i32(settings.subdivisions)) / f32(settings.size.y) + f32(settings.subdivisions)));
    let slope:i32 = slopes.numbers[row * settings.subdivisions + col];
    var norm:vec3<f32>;
    var d:f32;
    if(cz < -1 * cx + slope) {
        norm = facet12.plane[row * settings.subdivisions + col].norm;
        d = facet12.plane[row * settings.subdivisions + col].d;
    } else {
        let index:u32 = facetSize + (row * settings.subdivisions + col);
        norm = facet12.plane[index].norm;
        d = facet12.plane[index].d;
    }

    let y:f32 = -(norm.x * f32(cx) + norm.z * f32(cz) + d) / norm.y;
    if( y > 3.0 ) {
        textureStore(ground_texture, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(0.0,1.0,0.0,1.0));
     } else {
        textureStore(ground_texture, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(1.0,1.0,0.0,1.0));
     }
    return;
  }