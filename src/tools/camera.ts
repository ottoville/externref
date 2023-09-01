class CameraTAB {
  /* activate = (): void => {
        this.activated=true;
    }*/
  activateDebugCamera = (enable: boolean): void => {
    if (enable) {
      //@ts-ignore
      this.camera.viewport = new Viewport(0.5, 0, 0.5, 1.0);
      // this.scene.activeCameras.push(this.scene.camera2);
    } else {
      //@ts-ignore
      this.camera.viewport = new Viewport(0, 0, 1, 1.0);
      // this.scene.removeCamera(this.scene.camera2);
    }
  };
}
