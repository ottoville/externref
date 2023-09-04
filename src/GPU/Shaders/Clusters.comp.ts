import { PROJECTION_BUFFER_SIZE } from '../Projection.js';
import { PipelineLayout } from '../PipelineLayout.js';
import {
  Clusters,
  ProjectionStruct,
  ScreenDimensions,
} from './structs/Structs.js';
import type { GPU } from '../../GPU.js';
import {
  BGLayout,
  BufLayout,
  ComputeShader,
  ComputeShaderFunction,
  ShaderStage,
} from '../../webgpu-ts/index.js';

export const UpdateClustersBufferLayout = new BufLayout(
  {
    buffer: {
      hasDynamicOffset: false,
      minBindingSize: 7962624,
      type: 'storage',
    },
    visibility: ShaderStage.COMPUTE,
  },
  Clusters,
);

export function createClustersCompShader(
  sizeGroup: GPU['sizeBindGroupLayout'],
) {
  const bindLayouts = [
    sizeGroup,
    new BGLayout(sizeGroup.gpu, 'CreateClustersLayout2', {
      clusters: UpdateClustersBufferLayout,
      screentoview: new BufLayout(
        {
          buffer: {
            hasDynamicOffset: false,
            minBindingSize: PROJECTION_BUFFER_SIZE,
            type: 'uniform',
          },
          visibility: ShaderStage.COMPUTE,
        },
        ProjectionStruct,
      ),
    }),
  ] as const;
  const pipelineLayout = new PipelineLayout({
    bindGroupLayouts: bindLayouts,
    label: 'ClustersPipeline',
  });
  return [
    bindLayouts,
    new ComputeShader(
      {
        entryPoints: {
          main: new ComputeShaderFunction<
            [
              {
                screen_dimensions: BufLayout<number, typeof ScreenDimensions>;
              },
              {
                clusters: BufLayout<ShaderStage.COMPUTE, typeof Clusters>;
                screentoview: BufLayout<
                  ShaderStage.COMPUTE,
                  typeof ProjectionStruct
                >;
              },
            ]
          >(
            '@builtin(global_invocation_id) global_id : vec3<u32>',
            [4, 2, 4],
            ([
              { screen_dimensions },
              { clusters, screentoview },
            ]) => /* wgsl */ `
            let tileIndex = global_id.x +
            global_id.y * tileCount.x +
            global_id.z * tileCount.x * tileCount.y;
let tileSize = vec2<f32>(${screen_dimensions.prop(
              'screenDimensions',
            )}.x / f32(tileCount.x),
                     ${screen_dimensions.prop(
                       'screenDimensions',
                     )}.y / f32(tileCount.y));
//Calculating the min and max point in screen space

let maxPoint_sS = vec4<f32>(vec2<f32>(f32(global_id.x+1u), f32(global_id.y+1u)) * tileSize, 1.0, 1.0);
let minPoint_sS = vec4<f32>(vec2<f32>(f32(global_id.x), f32(global_id.y)) * tileSize, 1.0, 1.0);
//Pass min and max to view space
let maxPoint_vS = screen2View(maxPoint_sS).xyz;
let minPoint_vS = screen2View(minPoint_sS).xyz;
//Near and far values of the cluster in view space
let tileNear = -${screentoview.prop('zNear')} * pow(${screentoview.prop(
              'zFar',
            )}/ ${screentoview.prop(
              'zNear',
            )}, f32(global_id.z)/f32(tileCount.z));
let tileFar = -${screentoview.prop('zNear')} * pow(${screentoview.prop(
              'zFar',
            )}/ ${screentoview.prop(
              'zNear',
            )}, f32(global_id.z+1u)/f32(tileCount.z));
//Finding the 4 intersection points made from the maxPoint to the cluster near/far plane
let minPointNear = lineIntersectionToZPlane(eyePos, minPoint_vS, tileNear);
let minPointFar = lineIntersectionToZPlane(eyePos, minPoint_vS, tileFar);
let maxPointNear = lineIntersectionToZPlane(eyePos, maxPoint_vS, tileNear);
let maxPointFar = lineIntersectionToZPlane(eyePos, maxPoint_vS, tileFar);
//Getting the 
${clusters.prop(
  'bounds',
)}[tileIndex].minAABB = vec4<f32>(min(min(minPointNear, minPointFar),min(maxPointNear, maxPointFar)),0);
${clusters.prop(
  'bounds',
)}[tileIndex].maxAABB = vec4<f32>(max(max(minPointNear, minPointFar),max(maxPointNear, maxPointFar)),0);

            `,
          ),
        },
        gpu: pipelineLayout.gpu,
        label: 'Clusters.comp',
        pipelineLayouts: [pipelineLayout],
      },
      ([{ screen_dimensions }, { /*clusters,*/ screentoview }]) => /* wgsl */ `
    fn clipToView(clip : vec4<f32>) -> vec4<f32> {
        //View space transform
         let view = ${screentoview.prop('inversed_projection')} * clip;
          //Perspective projection
         return view / view.w;
        }
        
        fn screen2View(screen : vec4<f32>) -> vec4<f32> {
          //Convert to NDC
         let texCoord = screen.xy /  ${screen_dimensions.prop(
           'screenDimensions',
         )};
             //Convert to clipSpace
        
         let clip = vec4<f32>(vec2<f32>(texCoord.x, 1.0 - texCoord.y) * 2.0 - 1.0, screen.z, screen.w);
        
         //Not sure which of the two it is just yet
         return clipToView(clip);
        }
        
        //Creates a line from the eye to the screenpoint, then finds its intersection
        //With a z oriented plane located at the given distance to the origin
        fn lineIntersectionToZPlane(a : vec3<f32>, b : vec3<f32>, zDistance : f32) -> vec3<f32> {
         //Because this is a Z based normal this is fixed
         let normal = vec3<f32>(0.0, 0.0, 1.0);
         let ab = b - a;
         //Computing the intersection length for the line and the plane
         let t = (zDistance - dot(normal, a)) / dot(normal, ab);
         //Computing the actual xyz position of the point along the line
         return a + t * ab;
        }
        
        //Eye position is zero in view space
        const eyePos = vec3<f32>(0.0, 0.0, 0.0);
        
        //let tileCount : vec3<u32> = vec3<u32>(1u, 1u, 1u);
        const tileCount : vec3<u32> = vec3<u32>(32u, 18u, 48u);
    `,
    ),
  ] as const;
}
export type ClustersComp = ReturnType<typeof createClustersCompShader>;
