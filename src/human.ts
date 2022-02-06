//@ts-ignore
import { ARROW_KEYS, MeshCamera } from "./controllers/MeshCamera.js";
import type { Engine } from "./engine.js";
import { Box } from "./GPU/Meshes/Box.js";
import type { Scene } from "./Scene.js";
declare const engine:Engine;
const maxAcceleration = 10;

export class Human extends Box {
    inputManager: MeshCamera;
    constructor(scenes: Scene[]) {
        super(scenes,400, true, 'human');
        this.hasGravity = true;
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        this.translation = [-239.37437438964844, 1400, 910.1807250976562];
        //this.velocity=[0,-5,0];
        this.update_scale(1, 1, 1);
       // engine.inputManager?.destroy();
       // engine.inputManager=null;
        this.inputManager = new MeshCamera(engine.mainCamera);
        this.radius[0] = 0.5;
        this.radius[1] = 2;
        this.radius[2] = 0.5;
    }
    override onPhysicTick = () => {
        if((this.inputManager.arrowKeysDown & (ARROW_KEYS.LEFT_AND_RIGHT)) >0) {
            if((this.inputManager.arrowKeysDown & ARROW_KEYS.RIGHT) === ARROW_KEYS.RIGHT) {
                this.inputManager.angle+=0.03;
                if(this.inputManager.angle > Math.PI)
                    this.inputManager.angle=-Math.PI-(this.inputManager.angle%Math.PI)
            }
            if((this.inputManager.arrowKeysDown & ARROW_KEYS.LEFT) === ARROW_KEYS.LEFT) {
                this.inputManager.angle-=0.03;
                if(this.inputManager.angle < -Math.PI)
                    this.inputManager.angle=Math.PI-(this.inputManager.angle%Math.PI)
            }
            this.inputManager.camera.updateDirection(direction => {
                direction[0]=Math.cos(this.inputManager.angle);
                direction[1]=0;
                direction[2]=Math.sin(this.inputManager.angle);
            });
        }
        //engine.mainCamera.position=this.translation;
    }
    override onCollide() {
        if(this.speed<1.4) {
            if((this.inputManager.arrowKeysDown & ARROW_KEYS.UP) === ARROW_KEYS.UP) {
                const direction=this.inputManager.camera.direction;
                this.force[0]-=(direction[0]*maxAcceleration)
                this.force[2]-=(direction[2]*maxAcceleration)
            }
            if((this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN) === ARROW_KEYS.DOWN) {
                const direction=this.inputManager.camera.direction;
                this.force[0]+=(direction[0]*maxAcceleration)
                this.force[2]+=(direction[2]*maxAcceleration)
            }
        }
    }
}