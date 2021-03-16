[[location(0)]] var<out> position : vec2<f32>;
[[location(1)]] var<out> color : vec3<f32>;
[[location(2)]] var<out> posX : f32;
[[location(3)]] var<out> posY : f32;
[[location(4)]] var<out> uv : vec2<f32>;

const colors : array<vec3<f32>, 6> = array<vec3<f32>, 6>(
    vec3<f32>( 1.0, 0.0, 0.0),
    vec3<f32>( 0.0, 1.0, 0.0),
    vec3<f32>( 0.0, 0.0, 1.0),
    vec3<f32>( 1.0, 1.0, 0.0),
    vec3<f32>( 0.0, 1.0, 1.0),
    vec3<f32>( 1.0, 0.0, 1.0)
);

const vertices : array<vec2<f32>, 6> = array<vec2<f32>, 6>(
    vec2<f32>( -0.85, 0.9),
    vec2<f32>( 0.9, -0.85),
    vec2<f32>( 0.9, 0.9),


    vec2<f32>( -0.9,  -0.9),
    vec2<f32>( 0.85, -0.9),
    vec2<f32>( -0.9,  0.85)


);

const uvs : array<vec2<f32>, 6> = array<vec2<f32>, 6>(
    vec2<f32>( 0.0,  0.0),
    vec2<f32>( 1.0, 0.0),
    vec2<f32>( 0.0,  1.0),

    vec2<f32>( 0.0, 1.0),
    vec2<f32>( 1.0, 0.0),
    vec2<f32>( 1.0, 1.0)
);

[[builtin(vertex_idx)]] var<in> VertexIndex : i32;
[[builtin(position)]] var<out> Position : vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
    Position=vec4<f32>(vertices[VertexIndex], 0.0, 1.0);
    position=vec2<f32>(vertices[VertexIndex].x, -vertices[VertexIndex].y);
    position=(position+vec2<f32>(1.0,1.0))*vec2<f32>(0.5,0.5);

    color=colors[VertexIndex];
    posX=position.x;
    posY=(vertices[VertexIndex].y+1.0)/2.0;
    uv=uvs[VertexIndex];
    return;
}