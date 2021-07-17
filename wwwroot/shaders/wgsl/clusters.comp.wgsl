//ssbo initialization
 struct VolumeTileAABB {
  minPoint : vec4<f32>;
  maxPoint : vec4<f32>;
};
[[block]] struct clusterArray {
  cluster : [[stride(32)]] array<VolumeTileAABB>;
};

[[block]] struct screenToView {
  inverseProjection : mat4x4<f32>;
  tileSizes : vec4<u32>;
};


[[block]] struct Uniforms {
  zNear : f32;
  zFar : f32;
  screenDimensions : vec2<u32>;

};
[[binding(0), group(0)]] var<storage, write> clusters : clusterArray;
[[binding(1), group(0)]] var<uniform> screentoview : screenToView;
[[binding(2), group(0)]] var<uniform> uniforms : Uniforms;


fn clipToView(clip : vec4<f32>) -> vec4<f32>{
    //View space transform
    var view:vec4<f32> = screentoview.inverseProjection * clip;

    //Perspective projection
    view = view / view.w;
    
    return view;
}

fn screen2View(screen:vec4<f32>) -> vec4<f32>{
    //Convert to NDC
    var texCoord:vec2<f32> = screen.xy / vec2<f32>(uniforms.screenDimensions.xy);

    //Convert to clipSpace
    // vec4 clip = vec4(vec2(texCoord.x, 1.0 - texCoord.y)* 2.0 - 1.0, screen.z, screen.w);
    var clip:vec4<f32> = vec4<f32>(vec2<f32>(texCoord.x, texCoord.y)* 2.0 - 1.0, screen.z, screen.w);
    //Not sure which of the two it is just yet

    return clipToView(clip);
}

//Creates a line from the eye to the screenpoint, then finds its intersection
//With a z oriented plane located at the given distance to the origin
fn lineIntersectionToZPlane(A:vec3<f32>, B:vec3<f32>, zDistance:f32) -> vec3<f32>{
    //Because this is a Z based normal this is fixed
    var normal:vec3<f32> = vec3<f32>(0.0, 0.0, 1.0);

    var ab:vec3<f32> =  B - A;

    //Computing the intersection length for the line and the plane
    var t:f32 = (zDistance - dot(normal, A)) / dot(normal, ab);

    //Computing the actual xyz position of the point along the line
    var result:vec3<f32> = A + t * ab;

    return result;
}



[[stage(compute), workgroup_size(4,2,4)]]
fn main(
    [[builtin(workgroup_id)]] gl_WorkGroupID : vec3<u32>,
    [[builtin(global_invocation_id)]] global_id : vec3<u32>
) {
    let tileCount : vec3<u32> = vec3<u32>(32u, 18u, 48u);


    //Eye position is zero in view space
    let eyePos: vec3<f32> = vec3<f32>(0.0,0.0,0.0);

    //Per Tile variables
    var tileSizePx:u32 = screentoview.tileSizes[3];
    let tileIndex = global_id.x +
                    global_id.y * tileCount.x +
                    global_id.z * tileCount.x * tileCount.y;
    //Calculating the min and max point in screen space
    var maxPoint_sS:vec4<f32> = vec4<f32>(vec2<f32>(f32(gl_WorkGroupID.x) + 1.0, f32(gl_WorkGroupID.y) + 1.0) * f32(tileSizePx), -1.0, 1.0); // Top Right
    var minPoint_sS:vec4<f32> = vec4<f32>(vec2<f32>(gl_WorkGroupID.xy * tileSizePx), -1.0, 1.0); // Bottom left
    
    //Pass min and max to view space
    var maxPoint_vS:vec3<f32> = screen2View(maxPoint_sS).xyz;
    var minPoint_vS:vec3<f32> = screen2View(minPoint_sS).xyz;

    //Near and far values of the cluster in view space
    var tileNear:f32  = -uniforms.zNear * pow(uniforms.zFar/ uniforms.zNear, f32(gl_WorkGroupID.z)/f32(tileCount.z));
    var tileFar:f32   = -uniforms.zNear * pow(uniforms.zFar/ uniforms.zNear, (f32(gl_WorkGroupID.z) + 1.0) /f32(tileCount.z));

    //Finding the 4 intersection points made from the maxPoint to the cluster near/far plane
    var minPointNear:vec3<f32> = lineIntersectionToZPlane(eyePos, minPoint_vS, tileNear );
    var minPointFar:vec3<f32> = lineIntersectionToZPlane(eyePos, minPoint_vS, tileFar );
    var maxPointNear:vec3<f32> = lineIntersectionToZPlane(eyePos, maxPoint_vS, tileNear );
    var maxPointFar:vec3<f32> = lineIntersectionToZPlane(eyePos, maxPoint_vS, tileFar );

    var minPointAABB:vec3<f32>= min(min(minPointNear, minPointFar),min(maxPointNear, maxPointFar));
    var maxPointAABB:vec3<f32>= max(max(minPointNear, minPointFar),max(maxPointNear, maxPointFar));

    //Getting the 
    clusters.cluster[tileIndex].minPoint  = vec4<f32>(minPointAABB , 0.0);
    clusters.cluster[tileIndex].maxPoint  = vec4<f32>(maxPointAABB , 0.0);

    //clusters.cluster[tileIndex].minPoint  = vec4<f32>(f32(tileIndex),f32(tileIndex),f32(tileIndex),f32(tileIndex));
    //clusters.cluster[tileIndex].maxPoint  = vec4<f32>(f32(tileIndex),f32(tileIndex),f32(tileIndex),f32(tileIndex));
}



