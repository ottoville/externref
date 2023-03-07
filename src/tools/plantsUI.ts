import { paintPlane } from "../paintGround/paintPlane.js";
import type { Plants } from "../plants/Plants.js";

import type { PTDresult } from "../types/interfaces/index.js";
import type { Engine, ListenerObj } from "../engine.js";
import { UINode } from "../ui/UINode.js";
import { Anchor, NumericUnit } from "../ui/UIRectangle.js";
import type { TopMenuButtonProps } from "../ui/topMenu.js";
import { Button, type ButtonProps } from "../ui/Button.js";
declare const engine: Engine;


export class PlantsUI extends Button<object, ButtonProps & TopMenuButtonProps> {
    static plantsMesh: Plants;
    private PT: paintPlane | null = null;
    scene = engine.scenes.get('main');
    constructor(props: ButtonProps & TopMenuButtonProps,
    ) {
        super(props);
        if (!this.scene) {
            throw (new Error('no scene'));
        }
    }
    #inputListener: ListenerObj<'keydown'> = {
        object: this,
        type: 'keydown',
        cb: (e: KeyboardEvent) => {
            if (e.code === "Digit1") {
                this.activateDraw()
            }
        }
    }
    #wasOpen = false;
    override render() {
        super.render();
        if (this.props.open) {
            this.#wasOpen = true
            engine.addInputListener(this.#inputListener);
            return [
                UINode.createCtrProps(Button,
                    {
                        ...this.props,
                        UIRectangleProps: {
                            label: 'createGrassButton',
                            scale: { min_width: 180, y: 50, unit: NumericUnit.px },
                            translate: {
                                x: {
                                    value: [100, NumericUnit.px],
                                    anchor: Anchor.LEFT
                                },
                                y: this.props.subMenuPosition
                            },
                        },
                        text: 'Create grass (1)',
                        onClick: () => this.activateDraw()
                    })
            ]
        } else if (this.#wasOpen) {
            this.#wasOpen = false;
            this.PT?.destroy();
            engine.clearInputListeners(this);
        }
        return null;
    }
    activateDraw = () => {
        try {
            this.PT = new paintPlane(this.scene!, this.props.terrain, (response: PTDresult) => {
                PlantsUI.plantsMesh.fillArea(response);
            });
        } catch (e) {
            console.error(e);
        }
    }
    override destroy(): void {
        super.destroy();
        this.PT?.destroy();
        engine.clearInputListeners(this);
    }
}
