//@ts-ignore
// eslint-disable-next-line @typescript-eslint/no-var-requires
const assert:typeof import('assert') = require('assert');

describe('Enviroment', function() {
  this.timeout(0);
  describe('Engine', function() {
    it('should init the Engine', async function(done) {
      const {Engine} = await import('/js/engine.js');
      const canvasContainer=document.body.appendChild(document.createElement('div'));
      const canvas=document.createElement('canvas');
      canvas.width=1000;
      canvas.height=1000;
      await Engine.initEngine(canvasContainer.appendChild(canvas));

      const tests = await (await fetch('/js/tests.json').then(response=> response.json())).map((testAsset:string) => {
        const url = new URL(testAsset, location.origin+'/js/')

        return import(url.href.replace('.test.ts', '.test.js')).then(test => test.run(assert))
      })

      await Promise.all(tests);
      done();
    });
  });
});