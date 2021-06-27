


let vertices : array<vec2<f32>, 6> = array<vec2<f32>, 6>(
    vec2<f32>( -1.0, 1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0, 1.0),

    vec2<f32>( -1.0,  -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( -1.0,  1.0)
);

struct Output {
    [[builtin(position)]] Position : vec4<f32>;
    [[location(0)]] position : vec2<f32>;
};

[[stage(vertex)]]
fn main([[location(0)]] vertices : vec2<f32>) -> Output {
    var output : Output;

    output.Position=vec4<f32>(vertices, 0.0, 1.0);
    output.position=vec2<f32>(vertices.x, -vertices.y);
    output.position=(output.position+vec2<f32>(1.0,1.0))*vec2<f32>(0.5,0.5);
    return output;
}