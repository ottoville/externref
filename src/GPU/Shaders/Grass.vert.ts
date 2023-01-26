import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import { GPU } from '../../GPU.js'

type BindLayouts = GPU["rootCameralayout"]["bindGroupLayouts"]

export class GrassVertShader extends VertexShader<
    { main: PipelineLayout },
    [GPUVertexBufferLayout, GPUVertexBufferLayout, GPUVertexBufferLayout],
    BindLayouts> {
    constructor(
        pipelineLayout: PipelineLayout<BindLayouts>,
        buffers: [GPUVertexBufferLayout, GPUVertexBufferLayout, GPUVertexBufferLayout]) {

        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: pipelineLayout
            },
            label: 'grass.vert'
        }, buffers);
        this.createWGSL((
            [/*uniform*/,],
            [scene, time,/*clusters_array, meshes, projection*/]
        ) => {

            //////////////////////////////////

            return /* wgsl */ `



const bending :array<f32, 7> = array<f32, 7>(0.0, 0.0,0.2,0.2,0.5,0.5,1.0);
const rot :array<vec2<f32>, 7> = array<vec2<f32>, 7>(
  vec2<f32>(0.0,0.0),
  vec2<f32>(0.0,0.0),
  vec2<f32>(1.0,0.0),
  vec2<f32>(1.0,0.0),
  vec2<f32>(1.0,0.0),
  vec2<f32>(1.0,0.0),
  vec2<f32>(1.0,0.0));

//[[block]] struct Lights {
//  [[offset(48)]] sunDirection : vec3<f32>;
//  [[offset(80)]] ambient : vec3<f32>;
//  [[offset(92)]] shadow : f32;
//};
//[[binding(0), group(1)]] var<uniform> lights : Lights;


//[[location(1)]] var<out> shading : f32;
//[[location(2)]] var<out> ambient : vec3<f32>;

//let PI:f32 = 3.141592653589793;

fn rand(co:vec2<f32>) -> f32 {
    return fract(sin(dot(co.xy ,vec2<f32>(12.9898,78.233))) * 43758.5453);
}

const windDirection:f32 = 0.0;
struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) color : vec3<f32>
};

const vertices_ : array<vec2<f32>, 7> = array<vec2<f32>, 7>(
    vec2<f32>(0.02,  0.0),
    vec2<f32>(-0.02, 0.0),
    vec2<f32>(0.014,  0.29),
    vec2<f32>(-0.014, 0.29),
    vec2<f32>(0.007, 0.57),
    vec2<f32>(-0.007, 0.57),
    vec2<f32>(0.0, 1.0)
);

@vertex
fn main(
    @location(0) positions : vec4<f32>, //position xyz + rotate
    @location(1) shape : vec4<f32>, // {x:scale, y:baseAngle, z:curve, w:color} (blade's shape properties)
    @location(2) vertices : vec2<f32>
) -> Output {
  var output:Output;
 //ambient = lights.ambient;
  var vertice:vec3<f32> = vec3<f32>(vertices.xy,0.0);
  //let windRotate:f32 = rot[VertexIndex].x;
  //TODO
  let windRotate:f32 = 0.0;

  //How fast wind direction and intensivy change


  var windIntensivy:f32 =(cos((f32(${time.prop('time')})*0.01 + positions.x)*0.1)+1.0)*0.5;
//  float windDirection=cos(windDelta*0.1)*PI*2;    //Wind direction changes most when wind intensity is lowest

  //var leanAndBaseCurve:f32 = shape.y + vertice.y*shape.z;
      //curve
  var curveAmount:f32 = vertice.y*shape.w + windIntensivy*vertice.y;
  var CosCurve:f32 = cos(curveAmount);
  var SinCurve:f32 = sin(curveAmount);
   var MCurve:mat3x3<f32> = mat3x3<f32>(
       vec3<f32>(1.0,0.0,0.0),
       vec3<f32>(0.0,CosCurve,-SinCurve),
       vec3<f32>(0.0,SinCurve,CosCurve)
   );

    //rotate
   var rotateAmountWind:f32 =windDirection*windRotate;
   var c:f32  = cos((positions.w+rotateAmountWind)/2.0);
   var s:f32  = sin((positions.w+rotateAmountWind)/2.0);
   var m:mat3x3<f32> = mat3x3<f32>(
       vec3<f32>(c,     0.0,    s),
       vec3<f32>(0.0,   1.0,    0.0),
       vec3<f32>(-s,    0.0,    c)
   );

   var mulMat:mat3x3<f32> = MCurve * m;
   vertice = vertice * mulMat;
   var normal:vec3<f32> = vec3<f32>(0.0,0.0,1.0) * mulMat;

   var scaled:vec3<f32> =shape.x*vertice;

   
   var worldPos:vec4<f32> = vec4<f32>(positions.xyz, 1.0) + vec4<f32>(scaled.x, scaled.y, scaled.z, 0.0);
  // var viewDirectionW:vec3<f32> = normalize(${scene.prop('viewPosition')} - worldPos.xyz);
   //normal = normal * sign(dot(viewDirectionW, normal));

   //var diffuse:f32 = dot(normal, lights.sunDirection)*lights.shadow;

   output.Position = ${scene.prop('modelViewProjection')} * worldPos;

   output.color = vec3<f32>(clamp(shape.w,0.0,1.0),1.0,0.0);//*diffuse;
    return output;
}
  `;
            //////////////
        })
    }
}