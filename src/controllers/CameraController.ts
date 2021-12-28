export abstract class CameraController {
    abstract readonly name: string;
    abstract destroy() : void;
    abstract enable() : void;
    abstract disable() : void;
    abstract checkInputs() : void
    abstract calculateCameraPositionAndTarget?(): void
    abstract serialize(): void;
}