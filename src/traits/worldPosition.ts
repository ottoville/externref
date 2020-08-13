import type { GPUScene } from "../GPUScene";
export interface has3DPosition {
    worldPosition: worldPosition;
}
export interface TerraMatrix {
    readonly length: 16;
    [n: number]: never
}
export class TerraMatrix extends Float32Array {
    constructor(Arr? :  [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]) {
        //@ts-ignore
        super(Arr||16);
    } //@ts-ignore
    [0]: number;//@ts-ignore
    [1]: number;//@ts-ignore
    [2]: number;//@ts-ignore
    [3]: number;//@ts-ignore
    [4]: number;//@ts-ignore
    [5]: number;//@ts-ignore
    [6]: number;//@ts-ignore
    [7]: number;//@ts-ignore
    [8]: number;//@ts-ignore
    [9]: number;//@ts-ignore
    [10]: number;//@ts-ignore
    [11]: number;//@ts-ignore
    [12]: number;//@ts-ignore
    [13]: number;//@ts-ignore
    [14]: number;//@ts-ignore
    [15]: number;
}

/* Todo: make dynamic with treshold values */
const maxInstances = 10;
const alignment = 256;
export class worldPositionScene {
    instances: Set<worldPosition> = new Set();
    worldCopyGPU = this.scene.createGPUBuffer(alignment * maxInstances, [GPUBufferUsage.MAP_WRITE, GPUBufferUsage.COPY_SRC]);
    matrix = this.scene.createGPUBuffer(alignment * maxInstances, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]);

    BindGroupLayout = this.scene.createBindGroupLayout({ binding: 0, visibility: GPUShaderStage.VERTEX, type: "uniform-buffer", hasDynamicOffset: true });
    BindGroup = this.scene.createBindGroup(this.BindGroupLayout,
        {
            binding: 0,
            resource: {
                buffer: this.matrix,
                offset: 0,
                size: 16 * 4
            }
        })
    updateBuffer: GPUCommandBuffer[];
    constructor(public scene: GPUScene) {
        const commandEncoder = scene.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.worldCopyGPU, 0,
            this.matrix, 0,
            alignment * maxInstances);
        this.updateBuffer = [commandEncoder.finish()]
    }
}
export class worldPosition {
    scaling: [number, number, number] = [1, 1, 1];
    rotation: [number, number, number, number] = [0, 0, 0, 0];
    translation: [number, number, number] = [0, 0, 0];

    bufferOffset = this.scene.worldPositionScene.instances.size * alignment;


    constructor(public scene: GPUScene) {
        this.scene.worldPositionScene.instances.add(this);
    }
    destroy() {
        //this.#worldCopyGPU.destroy();
      //  this.worldPositionGPUBuffer.destroy();
    }
    private updateMatrix(): void {
        const m = this.worldMatrix;
        var x = this.rotation[0], y = this.rotation[1], z = this.rotation[2], w = this.rotation[3];
        var x2 = x + x, y2 = y + y, z2 = z + z;
        var xx = x * x2, xy = x * y2, xz = x * z2;
        var yy = y * y2, yz = y * z2, zz = z * z2;
        var wx = w * x2, wy = w * y2, wz = w * z2;

        var sx = this.scaling[0], sy = this.scaling[1], sz = this.scaling[2];
        m[0] = (1 - (yy + zz)) * sx;
        m[1] = (xy + wz) * sx;
        m[2] = (xz - wy) * sx;
        m[4] = (xy - wz) * sy;
        m[5] = (1 - (xx + zz)) * sy;
        m[6] = (yz + wx) * sy;

        m[8] = (xz + wy) * sz;
        m[9] = (yz - wx) * sz;
        m[10] = (1 - (xx + yy)) * sz;

        [m[12], m[13], m[14]] = this.translation;
        m[15] = 1;
    }
    worldMatrix: TerraMatrix = new TerraMatrix();
    busy = false;

    async updatePositionBuffer() {
        this.updateMatrix();
        if (this.busy)
            return;
        this.busy = true;
        await this.scene.worldPositionScene.worldCopyGPU.mapAsync(GPUMapMode.WRITE, this.bufferOffset, 4 * 16);
        new Float32Array(this.scene.worldPositionScene.worldCopyGPU.getMappedRange(this.bufferOffset, 4 * 16)).set(this.worldMatrix);
        this.scene.worldPositionScene.worldCopyGPU.unmap();
        this.scene.device.defaultQueue.submit(this.scene.worldPositionScene.updateBuffer);
        this.busy = false;
    }
}