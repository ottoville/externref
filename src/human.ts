//@ts-ignore
import { MeshCamera } from "./controllers/MeshCamera.js";
import type { Engine } from "engine.js";
import { Box } from "./GPU/Meshes/Box.js";
import type { Scene } from "./Scene.js";
declare const engine:Engine;

export class Human extends Box {
    constructor(scenes: Scene[]) {
        super(scenes, undefined,true, 'human');
        this.hasGravity = true;
        Object.getOwnPropertyNames(Human.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(Human.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });
        this.SetTranslation([-239.37437438964844, 1400, 910.1807250976562]);
        this.update_scale(engine.rustEngine,50, 50, 50);
       // engine.inputManager?.destroy();
       // engine.inputManager=new MeshCamera(engine.mainCamera);
    }
    override onPhysicTick = () => {

       // this.worldPosition.SetTranslationDelta([0,-1,0])
    }
    override async checkCollide() {
        const translation = this.get_translation();
        const translationDelta = this.get_velocity();
     //   console.log('checkCollide',...translationDelta)
     //   console.log('translation',...translation)
        const scaledPosition=engine.collider.scaledPosition;
        scaledPosition[0] = translation[0] / engine.collider.radius[0];
        scaledPosition[1] = translation[1] / engine.collider.radius[1];
        scaledPosition[2] = translation[2] / engine.collider.radius[2];
        const scaledVelocity=engine.collider.scaledVelocity;

        const newPosition= [
            translation[0]+translationDelta[0],
            translation[1]+translationDelta[1],
            translation[2]+translationDelta[2]
        ] as const


        scaledVelocity[0] = (newPosition[0]-translation[0])/engine.collider.radius[0];
        scaledVelocity[1] = (newPosition[1]-translation[1])/engine.collider.radius[1];
        scaledVelocity[2] = (newPosition[2]-translation[2])/engine.collider.radius[2];
        engine.collider.collidedMesh = undefined;
        engine.collider._retry = 0;

        await engine.collideWithWorld();

        engine.collider.finalPosition[0] *= engine.collider.radius[0]
        engine.collider.finalPosition[1] *= engine.collider.radius[1]
        engine.collider.finalPosition[2] *= engine.collider.radius[2]

    }
}