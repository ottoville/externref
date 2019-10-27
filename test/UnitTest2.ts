
describe("Test Suite 1", () => {
    it("Test A", () => {
        console.log(true, "This shouldn't fail");
    });

    it("Test B", () => {
        console.log(1 === 1, "This shouldn't fail");
        throw new Error("This should fail");
    });
});
