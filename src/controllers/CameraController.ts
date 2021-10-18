export abstract class CameraController {
    abstract readonly name: string;
    abstract destroy() : void;
    abstract checkInputs() : void
    abstract calculateCameraPositionAndTarget?(): void
    abstract serialize(): void;
}