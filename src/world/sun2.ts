import type { Scene } from "../Scene.js";
import { MainNode } from "../MainNode.js";
import { Angle } from "../Math.js";
import { GPU } from "../GPU.js";
import type { DrawableSimple } from "../GPU/Drawable.js";
import type { Engine } from "../engine.js";
import { SunRenderPipeline } from "../GPU/RenderPipeLines/Sun.js";
declare const engine:Engine;

//const sundistance = 149600000000;

const zAngle = Math.cos(Math.PI * 0.2);
const yAngle = Math.sin(Math.PI * 0.2);

export class Sun2 extends MainNode {
    #clamp = (value: number, min: number, max: number) => {
        return Math.min(Math.max(value, min), max);
    }

    override onPhysicTick = (/*delta: number*/) => {
        const anglePerMinute = (Math.PI * 2) / 1439;
        //let meridian: number = Math.PI * 0.1;
        const meridian: number = Math.PI * 0.5;
        //149597870000

        //let sundistance = 149600; //divided by 100000
        const secondsOfDay = ~~((Number(engine.physics.tickTime * 60)) % 86400);
        const minutesOfDay = secondsOfDay / 60;
        const sunAngle = new Angle(minutesOfDay * anglePerMinute).sub(meridian);

        const sunPositionX = Math.sin(sunAngle);
        let sunPositionY = Math.cos(sunAngle);

        const sunPositionZ = sunPositionY * zAngle;


        sunPositionY = sunPositionY * yAngle;
        const translation=this.translation;
        this.velocity = [sunPositionX - translation[0], sunPositionY - translation[1], sunPositionZ - translation[2]];
        //const ambientR = this.clamp((sunPositionY * 2 + 0.4) * 0.8, 0.05, 0.3);
        const ambientR = this.#clamp((sunPositionY + 0.4) * 0.8, 0.05, 0.3);
        const ambientGB = this.#clamp((sunPositionY + 0.1) * 0.4 - 0.1, 0.05, 0.3);


        //earth shadow
        const shadow = this.#clamp(sunPositionY * 8 + 1, 0, 1); // <<3 == * 8
        this.gpu_custom_data=[ambientR, ambientGB, ambientGB, shadow];
        // this.customData.set([ambientR, ambientGB, ambientGB, shadow]);
        this.update_dynamic_buffer();

    }
    drawable: DrawableSimple | undefined;
    constructor(scenes: Scene[]) {
        super(14,undefined,1,undefined,'sun',scenes);
        this.drawable=GPU.createRenderPipeline(SunRenderPipeline, {
            topology: 'triangle-strip',
            cullMode: 'none',
            stripIndexFormat:'uint16'
        })?.addDrawableSimple(this,undefined,undefined,undefined);
        engine.physics.movables.push(this);
    }
}