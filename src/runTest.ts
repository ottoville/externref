//@ts-ignore
const assert:typeof import('assert') = require('assert');
describe('Enviroment', function() {
  describe('Engine', function() {
    it('should init the Engine', async function() {
      const {Engine} = await import('/js/engine.js');
      await Engine.initEngine(document.createElement('canvas'));
      const cameratest = await import('/js/controllers/camera.test.js');
      await cameratest.run(assert)
    });
  });
});