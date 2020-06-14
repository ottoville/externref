import { Trait } from "./trait";

export class worldPosition extends Trait {
    scaling: [number, number, number] = [1, 1, 1];
    rotation: [number, number, number, number] = [0, 0, 0, 0];
    translation: [number, number, number] = [0, 0, 0];
    worldPositionGPUBuffer: GPUBuffer;

    private worldCopyGPU: GPUBuffer;
    private updateWorldBuffer: GPUCommandBuffer[];

    constructor(public device: GPUDevice) {
        super();
        this.worldCopyGPU = device.createBuffer({ size: 16 * 4, usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC });
        this.worldPositionGPUBuffer = device.createBuffer({ size: 16 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.worldCopyGPU, 0,
            this.worldPositionGPUBuffer, 0,
            16 * 4);
        this.updateWorldBuffer = [commandEncoder.finish()];

    }
    destroy() {
        this.worldCopyGPU.destroy();
        this.worldPositionGPUBuffer.destroy();
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
    worldMatrix: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    busy = false;

    async updatePositionBuffer() {
        this.updateMatrix();
        if (this.busy)
            return;
        this.busy = true;
        const leftoverARR = await this.worldCopyGPU.mapWriteAsync();
        new Float32Array(leftoverARR).set(this.worldMatrix);
        this.worldCopyGPU.unmap();
        this.device.defaultQueue.submit(this.updateWorldBuffer);
        this.busy = false;
    }
}