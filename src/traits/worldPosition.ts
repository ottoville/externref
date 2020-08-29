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
        super(Arr || 16);
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
    instances: Map<worldPosition, number> = new Map();


    matrix = this.scene.createGPUBuffer(alignment * maxInstances, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE]);

    changed = false;

    BindGroupLayout = this.scene.createBindGroupLayout({ binding: 0, visibility: GPUShaderStage.VERTEX, type: "uniform-buffer", hasDynamicOffset: true });
    BindGroup = this.scene.createBindGroup(this.BindGroupLayout,
        {
            binding: 0,
            resource: {
                buffer: this.matrix,
                offset: 0,
                size: 16 * 4 + 3 * 4
            }
        });
    positionBindGroupTime = this.scene.baseBindGroup.addChildBindGroup(this.BindGroup, true);
    positionBindGroupNoTime = this.scene.baseBindGroupNoTime.addChildBindGroup(this.BindGroup, true);

   // updateBuffer: GPUCommandBuffer[];
    queue: Map<Float32Array, number> = new Map();
    constructor(public scene: GPUScene) {
    }
    #busy = false;
    updateGPUBuffer(): GPUCommandBuffer | null {
        if (this.queue.size === 0 || this.#busy)
            return null;
        this.#busy = true;
        const dataSize = 4 * 16 + 3 * 4;
        const tempSize = (dataSize + 4 ) * this.queue.size;
        const tempBuffer = this.scene.createGPUBuffer(tempSize, [GPUBufferUsage.COPY_SRC], true);
        let tempOffset = 0;
        const commandEncoder = this.scene.device.createCommandEncoder();
        this.queue.forEach((bufferOffset, matrix) => {
            new Float32Array(tempBuffer.getMappedRange(tempOffset * (dataSize + 4), dataSize)).set(matrix);
            commandEncoder.copyBufferToBuffer(
                tempBuffer, tempOffset++ * (dataSize + 4),
                this.matrix, bufferOffset,
                dataSize);
            //new Float32Array(this.worldCopyGPU.getMappedRange(bufferOffset, 4 * 16)).set(matrix);
        });
        tempBuffer.unmap();
       /* this.scene.GPU2CPU(async (arr) => {
            await arr.mapAsync(GPUMapMode.READ, 0, tempSize);
            const arrbuff = arr.getMappedRange(0, tempSize);
            console.log(new Float32Array(arrbuff));
            //debugger;
        }, tempBuffer);*/
        this.queue.clear();
       // this.worldCopyGPU.unmap();

        this.#busy = false;
        return commandEncoder.finish();
    }
}
export class worldPosition {
    data: Float32Array = new Float32Array([
        //3d matrix start, 64 bytes
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,
        //3d matrix end
        //delta start, 12 bytes
        0, 0, 0
        //delta end
    ]);
    readonly worldMatrix = new Float32Array(this.data.buffer, 0, 16) as TerraMatrix;
    readonly translation = new Float32Array(this.data.buffer, 12 * this.data.BYTES_PER_ELEMENT, 3);
    readonly translationDelta: Float32Array = new Float32Array(this.data.buffer, 16 * this.data.BYTES_PER_ELEMENT, 3);

    scaling: [number, number, number] = [1, 1, 1];
    rotation: [number, number, number, number] = [0, 0, 0, 0];


    SetTranslationDelta(value: [number, number, number] | [number, number] | [number] | Float32Array) {
       // console.log('set delta',value)
        this.translationDelta.set(value);
        this.updatePositionBuffer(false);
    }


    SetTranslation(value: [number, number, number] | [number, number] | [number] | Float32Array) {
     //   this.#previousTranslation.set(this.#translation);
        this.translation.set(value);
        this.updatePositionBuffer(false);
    }
    setTranslationX(value:number) {
        this.translation[0] = value;
        this.updatePositionBuffer(false);
    }
    setTranslationY(value: number) {
        this.translation[1] = value;
        this.updatePositionBuffer(false);
    }
    setTranslationZ(value: number) {
        this.translation[2] = value;
        this.updatePositionBuffer(false);
    }
   // bufferOffset = this.scene.worldPositionScene.instances.size * alignment;

   // #busy = false;
    bufferOffset = this.scene.worldPositionScene.instances.size * alignment;
    constructor(public scene: GPUScene) {
        this.scene.worldPositionScene.instances.set(this, this.scene.worldPositionScene.instances.size * alignment);
        this.updatePositionBuffer(false);
    }
    destroy() {
        this.scene.worldPositionScene.instances.delete(this);
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
    }
    

    async updatePositionBuffer(updateMatrix = true) {
        if (updateMatrix)
            this.updateMatrix();
        const bufferOffset = this.scene.worldPositionScene.instances.get(this);
        if (bufferOffset === undefined)
            throw (new Error('offset not found'));


        this.scene.worldPositionScene.queue.set(this.data, bufferOffset);

    }
}