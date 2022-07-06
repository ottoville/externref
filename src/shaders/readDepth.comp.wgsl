
struct Depth_And_Mesh {
  depth:f32,
  mesh:u32
};

struct Mouse {
  position:vec2<i32>
};
@binding(0) @group(0) var<storage, read_write> depth_and_mesh : Depth_And_Mesh;
@binding(0) @group(1) var depth_texture : texture_depth_multisampled_2d;
@binding(1) @group(1) var mesh_texture : texture_2d<u32>;
@binding(2) @group(1) var<uniform> mouse : Mouse;

@compute @workgroup_size(1, 1, 1)
fn main(
    @builtin(global_invocation_id) global_id : vec3<u32>
) {

    depth_and_mesh.depth=textureLoad(depth_texture, mouse.position, 1);
    depth_and_mesh.mesh=textureLoad(mesh_texture, mouse.position, 0).r;
}
