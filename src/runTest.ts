//@ts-ignore
// eslint-disable-next-line @typescript-eslint/no-var-requires
const assert:typeof import('assert') = require('assert');
describe('Enviroment', function() {
  describe('Engine', function() {
    it('should init the Engine', async function() {
      const {Engine} = await import('/js/engine.js');
      const canvasContainer=document.body.appendChild(document.createElement('div'));
      await Engine.initEngine(canvasContainer.appendChild(document.createElement('canvas')));
      const cameratest = await import('/js/controllers/camera.test.js');
      await cameratest.run(assert);
      const renderloopTest = await import('/js/renderloop.test.js');
      await renderloopTest.run(assert)

    });
  });
});