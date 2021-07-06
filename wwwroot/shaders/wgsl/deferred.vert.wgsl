struct Output {
    [[builtin(position)]] Position : vec4<f32>;
    [[location(0)]] uv : vec2<f32>;
};

[[stage(vertex)]]
fn main(
    [[builtin(vertex_idx)]] VertexIndex : u32) -> Output {
    var vertices = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0));

    var output : Output;

    output.Position=vec4<f32>(vertices[VertexIndex], 0.0, 1.0);
    output.uv=(vec2<f32>(vertices[VertexIndex].x, -vertices[VertexIndex].y)+vec2<f32>(1.0,1.0))*vec2<f32>(0.5,0.5);
    return output;

    //return vec4<f32>(vertices[VertexIndex], 0.0, 1.0);

}