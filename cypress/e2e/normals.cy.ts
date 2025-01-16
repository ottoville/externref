import type { Engine } from '../../engine';

describe('normals', () => {
  it('tests normals', () => {
    cy.viewport(900, 320);
    cy.visit(Cypress.env('host'));
    cy.get('button').click();
    cy.get('canvas', {
      timeout: 10000,
    });
    cy.get('#progressBarContainer', {
      timeout: 10000,
    }).should('not.exist');
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

        cy.get('li:nth-of-type(7) li').click();
        cy.get('button:nth-child(10)').click();
        cy.wait(4000).then(() => {
          cy.get('canvas').matchImage();
        });
      });
  });
});
