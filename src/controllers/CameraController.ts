abstract class CameraController {
    abstract destroy() : void;
    abstract checkInputs() : void
    abstract calculateCameraPositionAndTarget(): void
    abstract serialize(): void;
}