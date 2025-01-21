import type { Engine } from "../../src/engine.js";

describe("open menu", () => {
  it("tests open menu", () => {
    cy.viewport(900, 319);
    cy.visit(Cypress.env("host"));
    cy.get("game-container").shadow().find("button").first().click();
    cy.get("game-container").shadow().find("canvas", {
      timeout: 10000,
    });
    cy.get("game-container").shadow().find("#progressBarContainer", {
      timeout: 10000,
    }).should("not.exist");
    cy.get("body").type("{esc}");
    // eslint-disable-next-line promise/catch-or-return
    cy.window()
      .then((w) => {
        //@ts-expect-error
        const engine = w.engine as Engine;
        return new Promise<Engine>((resolver) => {
          engine.gpu!.afterRenderStart(() => {
            resolver(engine);
          });
        });
      })
      .then((engine) => {
        engine.gpu!.destroy();
        return new Promise<void>((resolver) => {
          engine.getGPU((gpu) => {
            gpu.afterRenderStart(() => {
              resolver();
            });
          }, true);
        });
      });
    // eslint-disable-next-line promise/catch-or-return
    cy.wait(5000).then(() => {
      cy.get("game-container").shadow().find("canvas").matchImage();
    });
  });
});
