//@ts-ignore
// eslint-disable-next-line @typescript-eslint/no-var-requires
const assert:typeof import('assert') = require('assert');
describe('Enviroment', function() {
  this.timeout(0);
  describe('Engine', function() {
    it('should init the Engine', async function(done) {
      const {Engine} = await import('/js/engine.js');
      const canvasContainer=document.body.appendChild(document.createElement('div'));
      await Engine.initEngine(canvasContainer.appendChild(document.createElement('canvas')));

      const tests = await (await fetch('/tests.json').then(response=> response.json())).map(testAsset => import(testAsset).then(test => test.run(assert)))

      await Promise.all(tests);
      done();
    });
  });
});