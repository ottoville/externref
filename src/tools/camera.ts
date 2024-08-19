class CameraTAB {
  /* activate = (): void => {
        this.activated=true;
    }*/
  activateDebugCamera = (enable: boolean): void => {
    if (enable) {
      //@ts-expect-error todo
      this.camera.viewport = new Viewport(0.5, 0, 0.5, 1.0);
      // this.scene.activeCameras.push(this.scene.camera2);
    } else {
      //@ts-expect-error todo
      this.camera.viewport = new Viewport(0, 0, 1, 1.0);
      // this.scene.removeCamera(this.scene.camera2);
    }
  };
}
