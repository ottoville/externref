import { TerraVector3 } from "../../Math.js";
import { MainNode } from "../../MainNode.js";
import { MSAARenderTarget } from "../RenderTargets/MSAARenderTarget.js";
import { ComputePipeline } from "../ComputePipeline.js";
import type { BindGroup } from "../BindGroup.js";
import { type BindUniformBuffer, type CopyDstBuffer, Buffer, GPUBufferUsage } from "../Buffer.js";
import { RenderPass, RenderPassProps } from "./RenderPass.js";
import type { ColorRenderTarget } from "../RenderTargets/ColorRenderTarget.js";
import { DepthRenderTarget } from "../RenderTargets/DepthRenderTarget.js";
import { DepthRenderPass } from "./DepthRenderPass.js";
import type { RenderTargetTextureUsageValue } from "GPU/RenderTargets/RenderTarget.js";

export class PickableRenderPass<T extends {
    [index: string]: (renderPass: RenderPass) => ColorRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>;
} = {
    [index: string]: (renderPass: RenderPass) => ColorRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>;
}> extends DepthRenderPass<T> {
    #pickBuffer: GPUBuffer;
    readonly #pickBufferRead?: GPUBuffer;
    readonly #pickPositionPipeline?: ComputePipeline;
    readonly #mousePositionBuffer?: CopyDstBuffer & BindUniformBuffer;
    readonly #pickPositionBindGroup0?: BindGroup;
    readonly #pickPositionBindGroup1?: BindGroup;
    #rowBytes = this.size.width*4;

    constructor(renderPassProps: RenderPassProps<T>,
        depthRenderTargetsConstructor: ((renderPass: RenderPass) => DepthRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>),
        ) {
            super(renderPassProps, depthRenderTargetsConstructor);
            if(renderPassProps.sampleCount == 4) {
                this.#pickPositionPipeline= new ComputePipeline(renderPassProps.gpu, 'readDepth.comp.wgsl');

                this.#pickBuffer = renderPassProps.gpu.device.createBuffer({
                    size: 4 * 4, //depth + meshID (four pixel)
                    usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
                    label: 'pickBuffer'
                });
                this.#pickBufferRead = renderPassProps.gpu.device.createBuffer({
                    size: 4 + 4, //depth + meshID (four pixel)
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                    label: 'pickBufferRead'
                });
                this.#mousePositionBuffer = Buffer.create(renderPassProps.gpu, 8,[GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST],'mousePositionBuffer');

                this.#pickPositionBindGroup0 = this.#pickPositionPipeline.createBindGroup(0,'pickPositionBindGroup0',() => [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.#pickBuffer
                        }
                    }]);
                this.#pickPositionBindGroup1 = this.#pickPositionPipeline.createBindGroup(1,'pickPositionBindGroup1',(bindGroup) => [
                        {
                            binding: 0,
                            resource: this.depthRenderTarget.view.getTextureBinding(bindGroup),
                        },
                        {
                            binding: 1,
                            resource: this.gpu.pickRenderPass.colorRenderTargets.gRenderTargetId.view.getTextureBinding(bindGroup)
                        },
                        {
                            binding: 2,
                            resource: this.#mousePositionBuffer!.getUniformBinding(bindGroup)
                }]);

            } else {
                const offset=this.#rowBytes%256;
                if(offset!==0)
                    this.#rowBytes=this.#rowBytes-offset+256
                this.#pickBuffer = this.gpu.device.createBuffer({
                    size: this.#rowBytes * this.size.height,
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                    label: 'pickBuffer'
                }); 
            }
            
    }
    override resize(width: number, height: number) {
        super.resize(width, height);
        if(this.sampleCount === 1) {
            //update picking
            const oldpickBuffer=this.#pickBuffer;
            if(oldpickBuffer) {
                setTimeout(() => {
                    oldpickBuffer.destroy();
                },1000);
            }
            this.#rowBytes=this.size.width*4;
            const offset=this.#rowBytes%256;
            if(offset!==0)
                this.#rowBytes=this.#rowBytes-offset+256

            this.#pickBuffer = this.gpu.device.createBuffer({
                size: this.#rowBytes * this.size.height,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                label: 'pickBuffer'
            });
        }
    }

    pickPromise: Promise<{ position: TerraVector3 } | null> | null = null;
    pickPromiseMesh: Promise<{ position: TerraVector3, meshId: number } | null> | null = null;
    #zAndIDPromise:Promise<[z:number, id:number]> | null = null;
    pickPosition(): Promise<{ position: TerraVector3 } | null>
    pickPosition(mesh:true): Promise<{ position: TerraVector3, meshId: number } | null>
    pickPosition(mesh=false): Promise<{ position: TerraVector3 } | null> | Promise<{ position: TerraVector3, meshId: number } | null> {
        if (mesh && this.pickPromiseMesh) {
            return this.pickPromiseMesh
        }
        else if (!mesh && this.pickPromise) {
            return this.pickPromise
        }
        const camera = [...this.perspectiveCameras][0]!;
        const encoder = this.gpu.device.createCommandEncoder({label: 'pickPosition_encoder'});
        const gRenderTargetDiffuse = this.gpu.renderPassScreen.colorRenderTargets.gRenderTargetDiffuse
        if(gRenderTargetDiffuse instanceof MSAARenderTarget) {
            if(!this.#zAndIDPromise) {
                const mousePositionSwapBuffer = Buffer.create(this.gpu,8,[GPUBufferUsage.COPY_SRC], 'mousePositionSwapBuffer', b => {
                    new Uint32Array(b.getMappedRange(0,8)).set([this.gpu.mousePosition[0], this.gpu.mousePosition[1]]);
                });
                mousePositionSwapBuffer.copyTo(encoder,this.#mousePositionBuffer!,0, 0, 8,);
                const pickPass = encoder.beginComputePass({label:'pickPass'});
                pickPass.setPipeline(this.#pickPositionPipeline!.pipeline);
                pickPass.setBindGroup(0, this.#pickPositionBindGroup0!.bindGroup);
                pickPass.setBindGroup(1, this.#pickPositionBindGroup1!.bindGroup);
                pickPass.dispatchWorkgroups(1);
                pickPass.end();
                encoder.copyBufferToBuffer(this.#pickBuffer,0,this.#pickBufferRead!,0,4+4);
                this.gpu.device.queue.submit([encoder.finish()]);
           
                this.#zAndIDPromise = this.#pickBufferRead!.mapAsync(GPUMapMode.READ,0,4+4).then(() => {
                    const b = this.#pickBufferRead!.getMappedRange(0,4+4);
                    const z = new DataView(b).getFloat32(0, true);
                    const meshID = new DataView(b).getUint32(4, true);
                    this.#pickBufferRead!.unmap();
                    this.#zAndIDPromise = null;
                    return [z, meshID];
                });
            }
        }
        else {
            let newOffset=this.gpu.mousePosition[1] * this.#rowBytes + this.gpu.mousePosition[0] * 4;
            //For MapAsync
            const missOffset = newOffset % 8; 
            if(missOffset!==0) {
                newOffset=newOffset-missOffset
            }
            //The entire subresource must be copied when the format (TextureFormat::Depth32Float) is a depth/stencil format or the sample count (1) is > 1.
            encoder.copyTextureToBuffer(
                {
                    texture: this.depthRenderTarget.texture,
                    aspect: "depth-only",
                    origin: { x: 0, y: 0, z: 0 }
                },
                {
                    buffer: this.#pickBuffer,
                    bytesPerRow: this.#rowBytes,
                    offset: 0
                },
                [this.size.width, this.size.height]
            );
            if(mesh) {
                encoder.copyTextureToBuffer(
                    {
                        texture: this.gpu.pickRenderPass.colorRenderTargets.gRenderTargetId.texture,
                        origin: { x: this.gpu.mousePosition[0], y: this.gpu.mousePosition[1], z: 0 }
                    },
                    {
                        buffer: this.#pickBuffer,
                        bytesPerRow: 256,
                        offset: newOffset + missOffset + 32
                    },
                    [1, 1, 1]
                );
            }
            this.gpu.device.queue.submit([encoder.finish()]);
            const buffer=this.#pickBuffer;
            if(!this.#zAndIDPromise) {
                this.#zAndIDPromise = this.#pickBuffer.mapAsync(GPUMapMode.READ,newOffset,missOffset+32 + 16).then(() => {
                    const b = buffer.getMappedRange(newOffset,missOffset+32 + 16);
                    const z = new DataView(b).getFloat32(missOffset, true);
                    let meshId =0;
                    if(mesh) {
                        this.pickPromiseMesh = null;
                        meshId = new DataView(b).getUint32(missOffset+32, true);
                    } else
                        this.pickPromise = null;
                    buffer.unmap();
                    this.#zAndIDPromise=null;
                    return [z, meshId];
                });
            }
        }
        const promise=this.#zAndIDPromise.then(zAndID => {

            if(zAndID[0] === 0) { // Z is 0 when did not hit anything, far plane value
                this.pickPromise = null;
                this.pickPromiseMesh = null;
                return null;
            }
            const result = new TerraVector3();
            const x = this.gpu.mousePosition[0] / this.size.width * 2 - 1;
            const y = -(this.gpu.mousePosition[1] / this.size.height * 2 - 1);
            new TerraVector3([x, y, zAndID[0]]).multiply2Ref(camera.projectionViewInverted, result);
            if(mesh) {
                this.pickPromiseMesh = null;
                return { position: result, meshId: zAndID[1] };
            } else
                this.pickPromise = null;
            return { position: result };
        });
        //Calculate inverted matrix while buffer is mapping
        if (camera.projectionViewInvertedIsDirty) {
            camera.projectionViewArr.invertToRef(camera.projectionViewInverted);
            camera.projectionViewInvertedIsDirty = false;
        }
        if(mesh) {
            this.pickPromiseMesh=promise as Promise<{
                position: TerraVector3;
                meshId: number;
            }>;
            return this.pickPromiseMesh;
        }
        else {
            this.pickPromise=promise;
            return this.pickPromise;
        }
    }
    async pickMesh(wantedMeshIds?: Set<number>, predicate?: (mesh: MainNode) => boolean): Promise<{ position: TerraVector3, mesh: MainNode } | null> {
        const pickInfo = await this.pickPosition(true);
        if (!pickInfo || (wantedMeshIds && !wantedMeshIds.has(pickInfo.meshId))) {
            return null;
        }
        else {
            const mesh = MainNode.Meshes.get(pickInfo.meshId);
            if (!mesh) {
                throw (new Error('Mesh, '+pickInfo.meshId+' not found'));
            }
            if (predicate && !predicate(mesh)) {
                return null;
            } else {
                return { position: pickInfo.position, mesh };
            }
        }
    }
}