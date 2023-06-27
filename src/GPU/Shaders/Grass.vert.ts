import { PipelineLayout } from '../PipelineLayout.js';
import { VertexBufferLayout2, VertexShader } from './VertexShader.js';
import { GPU } from '../../GPU.js'
import { VertexShaderFunction } from './ShaderFunction.js';
import { Struct } from './structs/Structs.js';

export const positionAttr = Object.freeze({
    position: {
        format: 'float32x4',
        offset: 0,
        shaderFormat: 'vec4<f32>',
        shaderLocation: 0,
    },
} as const);

export const shapeAttr = Object.freeze({
    shape: {
        format: 'float32x4',
        offset: 0,
        shaderFormat: 'vec4<f32>',
        shaderLocation: 1,
    },
} as const)

export const vertexPositionAttr = Object.freeze({
    vertex_position: {
        format: 'float32x2',
        offset: 0,
        shaderFormat: 'vec2<f32>',
        shaderLocation: 2,
    },
} as const)


type BindLayouts = GPU['rootCameralayout']['bindGroupLayouts']
export function createGrassVertShader(
    pipelineLayout: PipelineLayout<BindLayouts>,
    buffers: [VertexBufferLayout2<typeof positionAttr>, VertexBufferLayout2<typeof shapeAttr>, VertexBufferLayout2<typeof vertexPositionAttr>]
) {
    return new VertexShader({
        bindGroupLayouts: pipelineLayout.bindGroupLayouts,
        entryPoints: {
            main: new VertexShaderFunction(
                new Struct('Output', {
                    Position: ['@builtin(position)', 'vec4<f32>'],
                    color: ['@location(0)', 'vec3<f32>'],
                }),
                pipelineLayout,
                '',
                buffers,
                ([
                    [/*uniform*/,],
                    [scene, time/*clusters_array, meshes, projection*/]
                ], [{ position, }, { shape, }, { vertex_position, }]) => /* wgsl */ `
                var output:Output;
                //ambient = lights.ambient;
                 var vertice:vec3<f32> = vec3<f32>(${vertex_position}.xy,0.0);
                 //let windRotate:f32 = rot[VertexIndex].x;
                 //TODO
                 let windRotate:f32 = 0.0;
               
                 //How fast wind direction and intensivy change
               
               
                 var windIntensivy:f32 =(cos((f32(${time.prop('time')})*0.01 + ${position}.x)*0.1)+1.0)*0.5;
               //  float windDirection=cos(windDelta*0.1)*PI*2;    //Wind direction changes most when wind intensity is lowest
               
                 //var leanAndBaseCurve:f32 = ${shape}.y + vertice.y*${shape}.z;
                     //curve
                 var curveAmount:f32 = vertice.y*${shape}.w + windIntensivy*vertice.y;
                 var CosCurve:f32 = cos(curveAmount);
                 var SinCurve:f32 = sin(curveAmount);
                  var MCurve:mat3x3<f32> = mat3x3<f32>(
                      vec3<f32>(1.0,0.0,0.0),
                      vec3<f32>(0.0,CosCurve,-SinCurve),
                      vec3<f32>(0.0,SinCurve,CosCurve)
                  );
               
                   //rotate
                  var rotateAmountWind:f32 =windDirection*windRotate;
                  var c:f32  = cos((${position}.w+rotateAmountWind)/2.0);
                  var s:f32  = sin((${position}.w+rotateAmountWind)/2.0);
                  var m:mat3x3<f32> = mat3x3<f32>(
                      vec3<f32>(c,     0.0,    s),
                      vec3<f32>(0.0,   1.0,    0.0),
                      vec3<f32>(-s,    0.0,    c)
                  );
               
                  var mulMat:mat3x3<f32> = MCurve * m;
                  vertice = vertice * mulMat;
                  var normal:vec3<f32> = vec3<f32>(0.0,0.0,1.0) * mulMat;
               
                  var scaled:vec3<f32> =${shape}.x*vertice;
               
                  
                  var worldPos:vec4<f32> = vec4<f32>(${position}.xyz, 1.0) + vec4<f32>(scaled.x, scaled.y, scaled.z, 0.0);
                 // var viewDirectionW:vec3<f32> = normalize(${scene.prop('viewPosition')} - worldPos.xyz);
                  //normal = normal * sign(dot(viewDirectionW, normal));
               
                  //var diffuse:f32 = dot(normal, lights.sunDirection)*lights.shadow;
               
                  output.Position = ${scene.prop('modelViewProjection')} * worldPos;
               
                  output.color = vec3<f32>(clamp(${shape}.w,0.0,1.0),1.0,0.0);//*diffuse;
                   return output;
               
                `
            ),
        },
        gpu: pipelineLayout.gpu,
        label: 'grass.vert',
    }, () => /* wgsl */ `
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

const vertices_ : array<vec2<f32>, 7> = array<vec2<f32>, 7>(
vec2<f32>(0.02,  0.0),
vec2<f32>(-0.02, 0.0),
vec2<f32>(0.014,  0.29),
vec2<f32>(-0.014, 0.29),
vec2<f32>(0.007, 0.57),
vec2<f32>(-0.007, 0.57),
vec2<f32>(0.0, 1.0)
);
    `)
}

export type GrassVertShader = ReturnType<typeof createGrassVertShader>
