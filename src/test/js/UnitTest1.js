var canvas = document.body.appendChild(document.createElement('canvas'));
describe("Test Suite 1", () => {
    //var engine = new BABYLON.Engine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });
    //var scene = new WorldScene(engine, { provider: 'anomyous', accessToken: '123' }, {}, 0);
    it("Test A", () => {
        //console.log(true, "This shouldn't fail");
        console.log("This shouldn't fail");
    });
    it("Test B", () => {
        //assert.ok(1 === 1, "This shouldn't fail");
        console.log("This shouldn't fail");
        throw new Error("This should fail");
        // assert.ok(false, "This should fail");
    });
});
