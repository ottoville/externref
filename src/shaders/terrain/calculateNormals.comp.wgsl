struct FloatArray {
   numbers: array<f32>
};
struct Slopes {
   numbers: array<i32>
};
struct Settings {
     size : vec2<u32>,
     bufferSize : vec2<u32>,
     subdivisions : u32,
     heightMinMax : vec2<i32>,
     @align(32) max : vec2<i32>,
     textureSize:vec2<u32>
};

@binding(0) @group(0) var<uniform> settings : Settings;
@binding(0) @group(1) var<storage, read_write> normals : FloatArray;
@binding(0) @group(2) var<storage, read> slopes : Slopes;
@binding(1) @group(2) var<storage, read> facet12 : FloatArray;


@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
    let stride : u32 = u32(12);
    let facetSize : u32 = settings.subdivisions * settings.subdivisions * u32(4); //250*250* 4;

    let i:u32 = GlobalInvocationID.y * stride;
    let j:u32 = GlobalInvocationID.x * (settings.subdivisions + u32(1)) * stride;

    let rows:u32 = GlobalInvocationID.x * settings.subdivisions;
    let last_y:u32=GlobalInvocationID.y - u32(1);
    var index:u32 = (rows +  GlobalInvocationID.y) * u32(4);
    let norm1:vec3<f32> =vec3<f32>(
        facet12.numbers[index],
        facet12.numbers[index + u32(1)],
        facet12.numbers[index + u32(2)]
    );
    index= facetSize +  ((rows +  GlobalInvocationID.y) * u32(4));
    let norm2:vec3<f32> =vec3<f32>(
        facet12.numbers[index],
        facet12.numbers[index + u32(1)],
        facet12.numbers[index + u32(2)]
    );
    index = facetSize +  ((rows +  last_y) * u32(4));
    let norm4:vec3<f32> =vec3<f32>(
        facet12.numbers[index],
        facet12.numbers[index + u32(1)],
        facet12.numbers[index + u32(2)]
    );
    let last_x:u32 = GlobalInvocationID.x - u32(1);
  index = (last_x * settings.subdivisions +  (GlobalInvocationID.y)) * u32(4);
    let norm5:vec3<f32> =vec3<f32>(
        facet12.numbers[index],
        facet12.numbers[index + u32(1)],
        facet12.numbers[index + u32(1)]
    );
    index=(last_x * settings.subdivisions +  last_y) * u32(4);
    let norm7:vec3<f32> =vec3<f32>(
       facet12.numbers[index],
       facet12.numbers[index + u32(1)],
       facet12.numbers[index + u32(2)]
    );
    index=facetSize +  ((last_x * settings.subdivisions +  last_y) * u32(4));
    let norm8:vec3<f32> =vec3<f32>(
        facet12.numbers[index],
        facet12.numbers[index + u32(1)],
        facet12.numbers[index + u32(2)]
    );

    let normalized:vec3<f32> = normalize(norm1 + norm2 + norm4 + norm5 + norm7 + norm8);
    
    //1 and 2
    //1 and 3   close   1
    //1 and 4
    //1 and 5
    //1 and 6   close 1
    //1 and 7   close 1
    //1 and 8
    //2 and 3   close 2
    //2 and 4   close 3
    //2 and 5   close 1
    //2 and 6   close 1
    //2 and 7   close 1
    //2 and 8   close 1
    //3 and 4   close 1
    //3 and 5   close 2
    //3 and 6   VERY CLOSE
    //3 and 7   close 1
    //3 and 8   close 1
    //4 and 5   close 3
    //4 and 6   close 1
    //4 and 7   close 1
    //4 and 8   close 1
    //5 and 6   far
    //5 and 7   close 1
    //5 and 8   far
    //6 and 7   far
    //6 and 8   close 1
    //7 and 8   far
    

    normals.numbers[j + i + u32(4)]=normalized.x;
    normals.numbers[j + i + u32(5)]=normalized.y;
    normals.numbers[j + i + u32(6)]=normalized.z;
   
    return;
 }