[[location(0)]] var<out> color : vec3<f32>;

const vertices : array<vec2<f32>, 6> = array<vec2<f32>, 6>(
    vec2<f32>( -1.0,  -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( -1.0,  1.0),
    vec2<f32>( -1.0, 1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0, 1.0)
);

[[builtin(vertex_idx)]] var<in> VertexIndex : i32;
[[builtin(position)]] var<out> Position : vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
    Position=vec4<f32>(vertices[VertexIndex], 0.0, 1.0);
    color=vec3<f32>(1.0,0.0,0.0);
    return;
}