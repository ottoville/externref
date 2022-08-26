import { TerraMatrix } from "../Math.js";
import type { GPU } from "../GPU.js";
import { BindUniformBuffer, Buffer } from "../GPU/Buffer.js";
import { GPUBufferUsage } from "../GPU.js";

export class Projection {
    readonly projectionReversedZ=new TerraMatrix();
    readonly reversedProjectionFarPlane = new TerraMatrix();
    //field of view
    readonly #fov=0.4;
    readonly farPlane = 100000;
    readonly nearPlane = 1;
    gpuBuffer: BindUniformBuffer | undefined;

    constructor(gpu?:GPU) {
        this.gpuBuffer=this.update(1, gpu, true);
    }
    
    update(aspectRatio:number, gpu?:GPU, initial=false) {
        const f = 1.0 / Math.tan(this.#fov / 2);
        const nf = 1 / (this.nearPlane - this.farPlane);

        this.projectionReversedZ.set([
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

        if(!initial && this.gpuBuffer)
            this.gpuBuffer.destroy();
        if(gpu) {
            this.gpuBuffer = Buffer.create(gpu, 64+64+64+8+4+4+4+4, [GPUBufferUsage.UNIFORM],  'uniform_projection', b => {
                const gpuBuffer = b.getMappedRange();
                this.projectionReversedZ.invertToRef(new TerraMatrix(gpuBuffer));
                new TerraMatrix(gpuBuffer,64).set(this.projectionReversedZ);
                this.reversedProjectionFarPlane.invertToRef(new TerraMatrix(gpuBuffer,128));
                new Float32Array(gpuBuffer, 192,6).set([
                    this.nearPlane,
                    this.farPlane,
                    this.nearPlane*this.farPlane,
                    this.farPlane-this.nearPlane,
                    gpu.clustersInRow[2] / Math.log2(this.farPlane / this.nearPlane), //sliceScale
                    -(gpu.clustersInRow[2] * Math.log2(this.nearPlane) / Math.log2(this.farPlane / this.nearPlane)) //sliceBias
                ]);
            });
        }
        return this.gpuBuffer;
   }
}