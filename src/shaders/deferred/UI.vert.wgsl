struct Output {
    @builtin(position) Position : vec4<f32>,
    @location(0) v_uv : vec2<f32>,
};
struct Uniforms {
  translate: vec2<f32>,
};
@binding(0) @group(0) var<uniform> uniforms: Uniforms;
@binding(1) @group(0) var texture: texture_2d<f32>;


@vertex
fn main(
    @builtin(vertex_index) VertexIndex : u32,
    @location(0) position : vec2<f32>,
    @location(1) uv : vec2<f32>
    ) -> Output {
    var output : Output;   
    output.Position = vec4<f32>(uniforms.translate + position, 1.0, 1.0);
    output.v_uv=uv;
    return output;

}