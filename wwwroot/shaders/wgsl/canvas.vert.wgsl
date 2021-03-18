[[location(0)]] var<out> position : vec2<f32>;

const vertices : array<vec2<f32>, 6> = array<vec2<f32>, 6>(
    vec2<f32>( -1.0, 1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0, 1.0),

    vec2<f32>( -1.0,  -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( -1.0,  1.0)
);

[[builtin(vertex_idx)]] var<in> VertexIndex : i32;
[[builtin(position)]] var<out> Position : vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
    Position=vec4<f32>(vertices[VertexIndex], 0.0, 1.0);
    position=vec2<f32>(vertices[VertexIndex].x, -vertices[VertexIndex].y);
    position=(position+vec2<f32>(1.0,1.0))*vec2<f32>(0.5,0.5);
    return;
}