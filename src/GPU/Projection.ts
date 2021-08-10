import { TerraMatrix } from "../Math.js";
import type { GPU } from "../GPU.js";
import { GPUBufferUsage } from "../GPU.js";

export class Projection {
    readonly reversedProjection=new TerraMatrix();
    readonly reversedProjectionFarPlane = new TerraMatrix();
    //field of view
    readonly #fov=0.4;
    readonly farPlane = 100000;
    readonly nearPlane = 1;
    gpuBuffer: GPUUniformBuffer;

    constructor(private gpu:GPU) {
        this.gpuBuffer=this.update(1, true);
    }
    update(aspectRatio:number, initial=false) {
        const f = 1.0 / Math.tan(this.#fov / 2);
        const nf = 1 / (this.nearPlane - this.farPlane);

        this.reversedProjection.set([
            f / aspectRatio, 0.0, 0.0, 0.0,
            0.0, f, 0.0, 0.0,
            0.0, 0.0, 0.0, -1.0,
            0.0, 0.0, this.nearPlane, 0.0,
        ]);
        this.reversedProjectionFarPlane.set([
           f / aspectRatio, 0.0, 0.0, 0.0,
           0.0, f, 0.0, 0.0,
           0.0, 0.0, this.farPlane * nf, -1.0,
           0.0, 0.0, this.farPlane * this.nearPlane * nf, 0.0,
       ]);
        if(!initial)
            this.gpuBuffer.destroy();
        this.gpuBuffer = this.gpu.createGPUBuffer(64+64+64+8, [GPUBufferUsage.UNIFORM], true);
        const gpuBuffer = this.gpuBuffer.getMappedRange();
        this.reversedProjection.invertToRef(new TerraMatrix(gpuBuffer));
        new TerraMatrix(gpuBuffer,64).set(this.reversedProjection);
        this.reversedProjectionFarPlane.invertToRef(new TerraMatrix(gpuBuffer,128));
        new Float32Array(gpuBuffer, 192,2).set([this.nearPlane, this.farPlane]);
        this.gpuBuffer.unmap();
        return this.gpuBuffer;
   }
}