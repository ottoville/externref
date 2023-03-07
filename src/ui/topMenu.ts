import type { GPU } from "../GPU.js"
import type { Terrain } from "../world/Terrain.js";
import type { Engine, ListenerObj } from "../engine.js";
import { UINode } from "./UINode.js";
import { TerrainToolButton } from "../tools/TerrainTool.js";
import { PlantsUI } from "../tools/plantsUI.js";
import { Anchor, NumericUnit, VerticalPosition } from "./UIRectangle.js";
import { Zones } from "../tools/Zones.js";
declare const engine: Engine;

type MenuState = {
    menuOpenName: string | undefined,
};
const keyBoardMap: string[] = []

export type TopMenuButtonProps = {
    terrain: Terrain,
    menuTree: { level: number },
    open: boolean,
    subMenuPosition: VerticalPosition
}

export class createTopMenu extends UINode<{ gpu: GPU, terrain: Terrain }, MenuState> {
    constructor(props: { gpu: GPU, terrain: Terrain }) {
        super(props);
        this.state = {
            menuOpenName: undefined,
        }
        engine.addInputListener(this.#inputListener);
    }
    menuTree = { level: 0 }
    #inputListener: ListenerObj<'keydown'> = {
        object: this,
        type: 'keydown',
        cb: (e: KeyboardEvent) => {
            if (this.state.menuOpenName === undefined) {
                this.menuTree.level = 1;
                if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3") {
                    const num = e.code.at(-1);
                    if (num) {
                        const menu = keyBoardMap[parseInt(num) - 1];
                        if (menu) {
                            this.setState({
                                menuOpenName: menu
                            })
                        }
                    }

                }
            } else if (e.code === 'Backspace' && this.menuTree.level === 1) {
                this.setState({
                    menuOpenName: undefined
                })
            }
        }
    }
    render() {
        const props = this.props;
        const commonProps =
        {
            gpu: props.gpu,
            terrain: props.terrain,
            onClick: this.setActiveMenu,
            subMenuPosition: {
                value: [70, NumericUnit.px],
                anchor: Anchor.TOP
            } as const,
        }
        keyBoardMap.length = 0;
        const menus =
            [
                UINode.createCtrProps(PlantsUI, {
                    ...commonProps,
                    UIRectangleProps: {
                        label: 'Plants',
                        scale: { min_width: 0.07, y: 0.04, unit: NumericUnit["%"] },
                        translate: {
                            x: {
                                value: [-0.9, NumericUnit["%"]],
                                anchor: Anchor.CENTER
                            }, y: {
                                value: [0.9, NumericUnit["%"]],
                                anchor: Anchor.CENTER
                            }
                        }
                    },
                    open: this.state.menuOpenName === 'Plants',
                    text: 'Plants (1)',
                    menuTree: this.menuTree,
                }),
                UINode.createCtrProps(TerrainToolButton,
                    {
                        ...commonProps,
                        UIRectangleProps: {
                            label: 'Terrain',
                            scale: { min_width: 0.07, y: 0.04, unit: NumericUnit["%"] },
                            translate: {
                                x: {
                                    value: [-0.75, NumericUnit["%"]],
                                    anchor: Anchor.CENTER
                                }, y: {
                                    value: [0.9, NumericUnit["%"]],
                                    anchor: Anchor.CENTER
                                }
                            }
                        },
                        open: this.state.menuOpenName === 'Terrain',
                        text: 'Terrain (2)',
                        menuTree: this.menuTree,
                    }
                ),
                UINode.createCtrProps(Zones,
                    {
                        ...commonProps,
                        UIRectangleProps: {
                            label: 'Zones',
                            scale: { min_width: 0.07, y: 0.04, unit: NumericUnit["%"] },
                            translate: {
                                x: {
                                    value: [-0.6, NumericUnit["%"]],
                                    anchor: Anchor.CENTER
                                }, y: {
                                    value: [0.9, NumericUnit["%"]],
                                    anchor: Anchor.CENTER
                                }
                            }
                        },
                        menuTree: this.menuTree,
                        open: this.state.menuOpenName === 'Zones',
                        text: 'Zones (3)',
                    }
                ),
            ];
        menus.forEach(menu => {
            keyBoardMap.push(menu.props.UIRectangleProps.label)
        })
        return menus;
    }
    setActiveMenu = (menuName?: string) => {
        this.setState({
            menuOpenName: this.state.menuOpenName === menuName ? undefined : menuName
        })
    }
    override destroy(): void {
        super.destroy();
        engine.removeInputListener(this.#inputListener)
    }
}
