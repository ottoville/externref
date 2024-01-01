import type { Engine } from '../../engine';

describe('wireframe', () => {
  it('tests wireframe', () => {
    cy.viewport(900, 319);
    cy.visit('https://localhost:4280/');
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
        cy.get('button:nth-of-type(2)').click();
        cy.wait(4000).then(() => {
          cy.get('canvas').matchImage();
        });
      });
  });
});
