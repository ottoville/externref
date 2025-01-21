import type { Engine } from "../../src/engine.js";

describe('normals', () => {
  it('tests normals', () => {
    cy.viewport(900, 320);
    cy.visit(Cypress.env('host'));
    cy.get("game-container").shadow().find("button").first().click();
    cy.get("game-container").shadow().find("canvas", {
      timeout: 10000,
    });
    cy.get("game-container").shadow().find("#progressBarContainer", {
      timeout: 10000,
    }).should("not.exist");
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
      .then(() => {
        cy.get('body').type('{esc}');
        cy.wait(2000); 

        cy.get('body').type('{downArrow}');
        cy.get('body').type('{downArrow}');
        cy.get('body').type('{enter}');
        
        cy.get("game-container").shadow().find('dev-tools').shadow().find('li:nth-of-type(7) li').click();
        cy.get("game-container").shadow().find('dev-tools').shadow().find('button:nth-child(11)').click();
        cy.wait(4000).then(() => {
          cy.get("game-container").shadow().find('canvas').matchImage();
        });
      });
  });
});
