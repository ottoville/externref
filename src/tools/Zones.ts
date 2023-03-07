import { paintTexture } from "../paintGround/paintTexture.js";
import { Terrain } from "../world/Terrain.js";
import { PTDresult } from "../types/interfaces/index.js";

import type { Scene } from "../Scene.js";
import type { Engine, ListenerObj } from "../engine.js";
import { TextureUsageEnums } from "../GPU/Texture.js";
import { TextureView } from "../GPU/TextureView.js";
import { RenderTarget } from "../GPU/RenderTargets/RenderTarget.js";
import type { TopMenuButtonProps } from "../ui/topMenu.js";
import { Button, ButtonProps } from "../ui/Button.js";
import { UINode } from "../ui/UINode.js";
import { Anchor, NumericUnit } from "../ui/UIRectangle.js";
declare const engine: Engine;
export class Zones extends Button<object, ButtonProps & TopMenuButtonProps> {
    #PT?: paintTexture;
    #size = 5120;
    readonly #ratio: number //texture coordinates
    #zoneTexture?: RenderTarget<"rgba8unorm", 23>;
    scene: Scene;
    #wasOpen = false;
    constructor(
        props: ButtonProps & TopMenuButtonProps,
    ) {
        super(props);
        const initialScene = props.terrain.scenes[0];
        if (!initialScene) {
            throw (new Error('scene not found'))
        }
        this.scene = initialScene;

        this.#ratio = Terrain.size[0] / this.#size //texture coordinates
    }
    #inputListener: ListenerObj<'keydown'> = {
        object: this,
        type: 'keydown',
        cb: (e: KeyboardEvent) => {
            if (e.code === "Digit1") {
                this.paintZone();
            }
        }
    }
    paintZone() {
        if (this.#zoneTexture) {
            this.#PT = new paintTexture(this.scene, this.props.terrain, this.#zoneTexture, 5120, 5120, this.#ratio, (response) => {
                engine.DB?.transaction("zones", 'readwrite').objectStore("zones").put(response);
            })
        }
    }
    override render() {
        super.render();
        if (this.props.open && !this.#wasOpen) {
            this.#wasOpen = true;
            this.#zoneTexture = new RenderTarget({
                gpu: engine.gpu!,
                size: { width: 5120, height: 5120 },
                format: "rgba8unorm",
                usages: TextureUsageEnums["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC"],
                label: 'ZoneTexture'
            });
            engine.addInputListener(this.#inputListener);
            if (engine.DB) {
                const texture = new OffscreenCanvas(5120, 5120)
                const ctx = texture.getContext('2d');
                if (!ctx)
                    throw (new Error('getting 2d context failed'));
                ctx.beginPath();
                ctx.fillStyle = "yellow";
                ctx.fillRect(0, 0, 5120, 5120);
                const centerX = this.#size / 2;
                const centerZ = this.#size / 2;
                engine.DB.transaction("zones").objectStore("zones").getAll().onsuccess = (evt) => {
                    ctx.strokeStyle = "blue";
                    ctx.fillStyle = "blue";
                    ctx.lineWidth = 1;
                    //@ts-ignore
                    ((evt.target.result) as PTDresult[]).forEach(z => {
                        ctx.setTransform(1, 0, 0, 1, 0, 0);
                        ctx.translate(centerX + z.coord[0] / this.#ratio, centerZ + z.coord[1] / this.#ratio);
                        ctx.rotate(-z.rad);
                        ctx.fillRect(0, 0, -(z.size.height / this.#ratio), -(z.size.width / this.#ratio));
                    });
                    ctx.stroke();
                    this.#zoneTexture?.copyFromExternalImage({ source: texture }, {}, { width: 5120, height: 5120 });
                }
            }
            const staticScene = engine.scenes.get('static');
            if (!staticScene) {
                throw (new Error('staticScene not found'));
            }
            this.props.terrain.mesh.setTextureView(new TextureView(this.#zoneTexture));
            this.props.terrain.mesh.set_scenes(staticScene.id);
            return [
                UINode.createCtrProps(Button,
                    {
                        ...this.props,
                        UIRectangleProps: {
                            label: 'residentalButton',
                            scale: { min_width: 0.15, y: 0.07, unit: NumericUnit["%"] },
                            translate: {
                                x: {
                                    value: [-0.8, NumericUnit["%"]],
                                    anchor: Anchor.CENTER
                                },
                                y: this.props.subMenuPosition
                            },
                        },
                        text: 'Residental (1)',
                        onClick: () => {
                            this.paintZone()
                        }
                    }
                )
            ]
        } else if (!this.props.open && this.#wasOpen) {
            this.props.terrain.mesh.set_scenes(this.scene.id)
            this.props.terrain.mesh.setTextureView(new TextureView(this.props.terrain.texture));
            this.#zoneTexture?.destroy();
            this.#PT?.destroy();
            this.#wasOpen = false;
            engine.clearInputListeners(this);
        }
        return null;
    }
    override destroy(): void {
        super.destroy();
        this.#PT?.destroy();
        engine.clearInputListeners(this);
    }
}