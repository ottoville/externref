import type { Engine } from '../../engine.js';

describe('open menu', () => {
    it('tests open menu', () => {
        cy.viewport(1280, 219);
        cy.visit('https://localhost:4280/');
        cy.get('button').click();
        cy.get('canvas', {
            timeout: 10000,
        });
        cy.get('#progressBarContainer', {
            timeout: 10000,
        }).should('not.exist');
        cy.get('body').type('{esc}');
        // eslint-disable-next-line promise/catch-or-return
        cy.window().then((w) => {
            //@ts-expect-error
            const engine = w.engine as Engine;
            return new Promise<Engine>((resolver) => {
                engine.gpu!.afterRenderStart(() => {
                    resolver(engine)
                });
            })
        }).then((engine) => {
            engine.gpu!.destroy();
            return new Promise<void>((resolver) => {
                engine.getGPU(gpu => {
                    gpu.afterRenderStart(() => {
                        resolver()
                    });
                }, true);
            })
        })
        // eslint-disable-next-line promise/catch-or-return
        cy.wait(4000).then(() => {
            cy.get('canvas').matchImage();
        });

    });
});
