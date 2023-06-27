import { UINode } from './UINode.js';
import { Anchor, NumericUnit } from './UIRectangle.js';
import { Button } from './Button.js';
import type { Engine } from '../engine.js';
import { UIRectangleNode } from './UIRectangleNode.js';
declare const engine: Engine;

// eslint-disable-next-line @typescript-eslint/ban-types
export class createSettingsMenu extends UINode<{}> {
    static addKeydownListener() {
        document.addEventListener('keydown', function openSettings(e: KeyboardEvent) {
            if (e.code === 'Escape') {
                document.removeEventListener('keydown', openSettings);
                new createSettingsMenu();
            }
        });
    }
    constructor() {
        super({});
    }
    render() {
        return [
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'MSAA',
                    scale: { min_width: 200, unit: NumericUnit.px, y: 50, },
                    translate: {
                        x: {
                            anchor: Anchor.CENTER,
                            value: [0],
                        }, y: {
                            anchor: Anchor.CENTER,
                            value: [0],
                        },
                    },
                },
                text: 'Toggle MSAA',
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'Close',
                    scale: { min_width: 200, unit: NumericUnit.px, y: 50, },
                    translate: {
                        x: {
                            anchor: Anchor.CENTER,
                            value: [0],
                        }, y: {
                            anchor: Anchor.CENTER,
                            value: [-60, NumericUnit.px],
                        },
                    },
                },
                onClick: () => {
                    this.destroy();
                },
                text: 'Close',
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'DevTools',
                    scale: { min_width: 200, unit: NumericUnit.px, y: 50, },
                    translate: {
                        x: {
                            anchor: Anchor.CENTER,
                            value: [0],
                        }, y: {
                            anchor: Anchor.CENTER,
                            value: [-120, NumericUnit.px],
                        },
                    },
                },
                onClick: () => {
                    import('./DevTools/DevTools.js')
                        .then(({ DevTools, }) => DevTools(engine.devTools!))
                        .catch(err => engine.showError(err));
                    this.destroy();
                },
                text: 'DevTools',
            }))
        ];
    }
    override destroy(): void {
        super.destroy();
        createSettingsMenu.addKeydownListener()
    }
}
