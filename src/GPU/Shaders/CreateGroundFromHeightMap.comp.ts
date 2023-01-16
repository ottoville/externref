import { BGLayout, BufLayout, ShaderStage, TextLayout } from '../BindGroupLayout.js'
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import { Vertices } from './structs/Structs.js';


type BindLayouts = readonly [BGLayout<[BufLayout<ShaderStage.COMPUTE>]>,
  BGLayout<[BufLayout<ShaderStage.COMPUTE>, TextLayout<ShaderStage.COMPUTE>]>];
export class CreateGroundFromHeightMap extends ComputeShader<
  { main: PipelineLayout }, BindLayouts> {
  constructor(settingsLayout: BGLayout<[BufLayout<ShaderStage.COMPUTE>]>) {
    const bindLayouts = [
      settingsLayout,
      new BGLayout(settingsLayout.gpu, 'indicesBindGroupLayout',
        new BufLayout(
          {
            visibility: ShaderStage.COMPUTE,
            buffer: {
              type: "storage",
              hasDynamicOffset: false,
              minBindingSize: 48
            }
          }, 'positions', Vertices),
        new TextLayout(
          {
            visibility: ShaderStage.COMPUTE,
            texture: {

            }

          }, 'pixels', 'texture_2d<f32>'))
    ] as const

    const pipelineLayout = new PipelineLayout({
      label: 'CreateGroundFromHeightMapPipeline',
      bindGroupLayouts: bindLayouts
    });
    super({
      bindGroupLayouts: pipelineLayout.bindGroupLayouts,
      label: "CreateGroundFromHeightMap.comp",
      entryPoints: {
        main: pipelineLayout
      }
    });
    this.createWGSL(([settings], [positions, pixels]) => {
      //////////////////////////
      return /* wgsl */ `
    const filt:vec4<f32> = vec4<f32>(0.3, 0.59, 0.11, 0.0); 
    
    @compute @workgroup_size(1)
    fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
        let coords=vec2<f32>(
            f32(GlobalInvocationID.x * ${settings.variableName}.size.x) / f32(${settings.variableName}.subdivisions),
            f32(GlobalInvocationID.y * ${settings.variableName}.size.y) / f32(${settings.variableName}.subdivisions)
        );
        var position: vec3<f32> = vec3<f32>(f32(GlobalInvocationID.x * ${settings.variableName}.size.x) / f32(${settings.variableName}.subdivisions) - (f32(${settings.variableName}.size.x) / 2.0),
        0.0,
        f32((${settings.variableName}.subdivisions - GlobalInvocationID.y) * ${settings.variableName}.size.y) / f32(${settings.variableName}.subdivisions) - (f32(${settings.variableName}.size.y) / 2.0));
        // TODO: move to uniform
       let texture_size:vec2<u32> = textureDimensions(${pixels.variableName});
    
    
       let gradient:f32 = dot(textureLoad(${pixels.variableName}, vec2<i32>((vec2<f32>(texture_size)/vec2<f32>(${settings.variableName}.size)) * coords.xy), 0), filt);    
    
       position.y = f32(${settings.variableName}.heightMinMax.x) + f32( ${settings.variableName}.heightMinMax.y -  ${settings.variableName}.heightMinMax.x) * gradient;
       //position.y = 10.0;
       ${positions.variableName}.vert[GlobalInvocationID.y * (${settings.variableName}.subdivisions + u32(1)) + GlobalInvocationID.x].position = position;
      
       ${positions.variableName}.vert[GlobalInvocationID.y * (${settings.variableName}.subdivisions + u32(1)) + GlobalInvocationID.x].uv = (position.xz + vec2<f32>(${settings.variableName}.max)) / vec2<f32>(${settings.variableName}.size);
       return;
    }
      `;
      ///////////////
    })
  }
}