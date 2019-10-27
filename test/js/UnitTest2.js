//import assert = require('assert');
describe("Test Suite 1", function () {
    it("Test A", function () {
        console.log(true, "This shouldn't fail");
    });
    it("Test B", function () {
        console.log(1 === 1, "This shouldn't fail");
        throw new Error("This should fail");
    });
});
