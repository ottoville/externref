struct Output {
    [[builtin(position)]] Position : vec4<f32>;
};

[[stage(vertex)]]
fn main(
    [[builtin(vertex_index)]] VertexIndex : u32) -> Output {
    var vertices = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0));

    var output : Output;

    output.Position=vec4<f32>(vertices[VertexIndex], 0.0, 1.0);
    return output;

    //return vec4<f32>(vertices[VertexIndex], 0.0, 1.0);

}