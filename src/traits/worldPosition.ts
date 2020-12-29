import { BoundableNode, TerraNode } from "../TerraNode";
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


export class worldPosition {
    readonly worldMatrix = new Float32Array(this.node.data.buffer, this.node.bufferOffsetBytes, 16) as TerraMatrix;
    readonly translation = new Float32Array(this.node.data.buffer, this.node.bufferOffsetBytes+ 12 * this.node.data.BYTES_PER_ELEMENT, 3);
    readonly translationDelta: Float32Array = new Float32Array(this.node.data.buffer, this.node.bufferOffsetBytes + 16 * this.node.data.BYTES_PER_ELEMENT, 3);

    readonly #scaling: Float32Array = new Float32Array([1, 1, 1]);
    readonly #rotation: Float32Array = new Float32Array([0, 0, 0, 0]);

    public update(callback: (scaling: Float32Array, rotation: Float32Array) => void) {
        callback(this.#scaling, this.#rotation);
        this.updateMatrix();
        this.onUpdate();
    }

    SetTranslationDelta(value: [number, number, number] | [number, number] | [number] | Float32Array) {
        this.translationDelta.set(value);
        this.node.updateDynamicBuffer();
    }

    SetTranslation(value: [number, number, number] | [number, number] | [number] | Float32Array) {
        this.translation.set(value);
        this.onUpdate();
    }
    setTranslationX(value:number) {
        this.translation[0] = value;
        this.onUpdate();
    }
    setTranslationY(value: number) {
        this.translation[1] = value;
        this.onUpdate();
    }
    setTranslationZ(value: number) {
        this.translation[2] = value;
        this.onUpdate();
    }
   // bufferOffset = this.scene.worldPositionScene.instances.size * alignment;

   // #busy = false;
   // bufferOffset = this.node.scene.gpuscene.worldPositionScene.instances.size * alignment;

    constructor(public node: TerraNode | BoundableNode) {

       // node.scene.gpuscene.worldPositionScene.instances.set(this, node.scene.gpuscene.worldPositionScene.instances.size * alignment);
       // this.updatePositionBuffer(false);
        this.node.updateDynamicBuffer();
    }

    private updateMatrix(): void {
        const x = this.#rotation[0]
        const y = this.#rotation[1]
        const z = this.#rotation[2]
        const w = this.#rotation[3];

        const x2 = x + x
        const y2 = y + y
        const z2 = z + z;

        const xx = x * x2
        const xy = x * y2
        const xz = x * z2;

        const yy = y * y2
        const yz = y * z2
        const zz = z * z2;
        var wx = w * x2, wy = w * y2, wz = w * z2;

        var sx = this.#scaling[0], sy = this.#scaling[1], sz = this.#scaling[2];
        this.worldMatrix[0] = (1 - (yy + zz)) * sx;
        this.worldMatrix[1] = (xy + wz) * sx;
        this.worldMatrix[2] = (xz - wy) * sx;
        this.worldMatrix[4] = (xy - wz) * sy;
        this.worldMatrix[5] = (1 - (xx + zz)) * sy;
        this.worldMatrix[6] = (yz + wx) * sy;

        this.worldMatrix[8] = (xz + wy) * sz;
        this.worldMatrix[9] = (yz - wx) * sz;
        this.worldMatrix[10] = (1 - (xx + yy)) * sz;
    }
    private onUpdate(): void {
        if (this.node.isBoundable()) {
            this.node.updateBoundingBoxByMatrix(this.worldMatrix);
        }
        this.node.updateDynamicBuffer();
    }
}