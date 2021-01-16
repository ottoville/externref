import { TerraMatrix, TerraVector3, TerraVector4 } from "../Math";
import { BoundableNode, MainNode } from "../TerraNode";
export interface has3DPosition {
    worldPosition: worldPosition;
}


export class worldPosition {
    readonly worldMatrix = new TerraMatrix(this.node.data.buffer, this.node.bufferOffsetBytes);
    readonly translation = new TerraVector3(this.node.data.buffer, this.node.bufferOffsetBytes+ 12 * this.node.data.BYTES_PER_ELEMENT);
    readonly translationDelta: Float32Array = new Float32Array(this.node.data.buffer, this.node.bufferOffsetBytes + 16 * this.node.data.BYTES_PER_ELEMENT, 3);

    readonly #scaling = new TerraVector3([1, 1, 1]);
    readonly #rotation = new TerraVector4([0, 0, 0, 0]);

    public update(callback: (scaling: Float32Array, rotation: Float32Array) => void) {
        callback(this.#scaling, this.#rotation);
        this.updateMatrix();
        this.onUpdate();
    }

    SetTranslationDelta(value: [number, number, number] | [number, number] | [number] | Float32Array) {
        this.translationDelta.set(value);
        this.node.updateDynamicBuffer();
    }

    SetTranslation(value: [number, number, number] | TerraVector3) {
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

    constructor(public node: MainNode | BoundableNode) {

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

        const sx = this.#scaling[0]
        const sy = this.#scaling[1]
        const sz = this.#scaling[2];
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
        if (this.node instanceof BoundableNode)
            this.node.updateBoundingBoxByMatrix(this.worldMatrix);
        this.node.updateDynamicBuffer();
    }
}