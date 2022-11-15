import { UIRectangle } from "./UIRectangle.js";
import { GPU } from "../GPU.js"
import { PlantsUI } from "../tools/plantsUI.js";
import { Terrain } from "../world/terrain.js";
export function createTopMenu(gpu: GPU, terrain: Terrain) {
    return fetch('/assets/button.webp').then(async asset => {
        const bitmap = await createImageBitmap(await asset.blob());
        new UIRectangle({
            canvaspipeline: gpu.UIPipeline,
            renderPass: gpu.renderPassCanvas,
            label: 'UIButton',
            borderSize: {width:0.01, height: 'auto', texture_width: 0.2, texture_height: 0.2 },
            backgroundTexture: bitmap,
            scale: {min_width:0.07, y:0.07},
            translate: { x:-0.9, y: 0.5 },
            originalAspectRatio: 0.3,
            events: {
                onClick: (e) => {
                    console.log(e);
                    new UIRectangle({
                        canvaspipeline: gpu.UIPipeline,
                        renderPass: gpu.renderPassCanvas,
                        label: 'createGrassButton',
                        borderSize: {width:0.01, height: 'auto', texture_width: 0.2, texture_height: 0.2 },
                        backgroundTexture: bitmap,
                        scale: {min_width:0.15, y:0.07},
                        translate: { x:-0.8, y: 0.4 },
                        originalAspectRatio: 0.3,
                        events: {
                            onClick: (ee) =>  {
                                console.log(ee);
                                new PlantsUI(terrain).activateDraw()
                            }
                        },
                        text: 'Create grass'
                    });

                }
            },
            text: 'Plants'
        });
        new UIRectangle({
            canvaspipeline: gpu.UIPipeline,
            renderPass: gpu.renderPassCanvas,
            label: 'UIButton',
            borderSize: {width:0.01, height: 'auto', texture_width: 0.2, texture_height: 0.2 },
            backgroundTexture: bitmap,
            scale: {min_width:0.07, y:0.07},
            translate: { x:-0.75, y: 0.5 },
            originalAspectRatio: 0.3,
            events: {
                onClick: (e) => {
                    console.log(e);
                }
            },
            text: 'Terrain'
        });
        new UIRectangle({
            canvaspipeline: gpu.UIPipeline,
            renderPass: gpu.renderPassCanvas,
            label: 'UIButton',
            borderSize: {width:0.01, height: 'auto', texture_width: 0.2, texture_height: 0.2 },
            backgroundTexture: bitmap,
            scale: {min_width:0.07, y:0.07},
            translate: { x:-0.6, y: 0.5 },
            originalAspectRatio: 0.3,
            events: {
                onClick: (e) => {
                    console.log(e);
                }
            },
            text: 'Zones'
        });
    })
}