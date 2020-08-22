import { worldPosition } from "./traits/worldPosition";
import { TerraScene } from "./TerraScene";

export interface hasPhysics {
    onPhysicTick: (time: number) => void
    worldPosition: worldPosition
}

export class Physics {
    tickables: Set<hasPhysics> = new Set();
    lastTickTimeMs: number = new Date().getTime();
    #gameSpeed = 0;
    gameTime = 216000000;  //21600 * 1000; //6 hours
    #interval: number = 0;

    get physicTime() {
        if (this.#gameSpeed >= 0) {
            const timestamp = new Date().getTime();
            if (this.scene.lastStateChangeTime > this.lastTickTimeMs) {
                var delta = (timestamp - this.scene.lastStateChangeTime << this.#gameSpeed)+ this.#tickDeltaWhenStateChange
            } else {
                var delta = (timestamp - this.lastTickTimeMs) << this.#gameSpeed // get the delta time since last tick
            }
        }
        else
            var delta = (this.scene.lastStateChangeTime - this.scene.physics.lastTickTimeMs) << this.#gameSpeed;

        return (this.gameTime + delta);
    }

   /* private createLoop(speed:number) {
        return setInterval(function Tick(me: Physics) {
            const timestamp = new Date().getTime();
            const delta = timestamp - me.lastTickTimeMs; // get the delta time since last tick
            const step = delta / me.scene.tickIntervalMs;
            console.log(step);
            me.lastTickTimeMs = timestamp;
            me.#gameTime += delta;
            me.tickables.forEach(tickable => {
                const currentTranslation = tickable.worldPosition.translation;
                if (tickable.worldPosition.translationDelta[0] !== 0 || tickable.worldPosition.translationDelta[1] !== 0 || tickable.worldPosition.translationDelta[2] !== 0) {
                    tickable.worldPosition.translation.set([
                        currentTranslation[0] + tickable.worldPosition.translationDelta[0] * step,
                        currentTranslation[1] + tickable.worldPosition.translationDelta[1] * step,
                        currentTranslation[2] + tickable.worldPosition.translationDelta[2] * step
                    ]);
                }
                tickable.onPhysicTick(delta);
            });
            return Tick;
        }(this), this.scene.tickIntervalMs >> speed,this);
    }*/

    private tick(me: Physics) {
        const timestamp = new Date().getTime();
        if (me.scene.lastStateChangeTime > me.lastTickTimeMs) {
            var delta = ((timestamp - me.scene.lastStateChangeTime) << me.#gameSpeed) + me.#tickDeltaWhenStateChange
        } else {
            var delta = (timestamp - me.lastTickTimeMs) << me.#gameSpeed; // get the delta time since last tick
        }
        //  console.log(step);
        me.lastTickTimeMs = timestamp;
        me.gameTime += delta;
        me.tickables.forEach(tickable => {
            const currentTranslation = tickable.worldPosition.translation;
            if (tickable.worldPosition.translationDelta[0] !== 0 || tickable.worldPosition.translationDelta[1] !== 0 || tickable.worldPosition.translationDelta[2] !== 0) {
                tickable.worldPosition.translation.set([
                    currentTranslation[0] + tickable.worldPosition.translationDelta[0],
                    currentTranslation[1] + tickable.worldPosition.translationDelta[1],
                    currentTranslation[2] + tickable.worldPosition.translationDelta[2]
                ]);
            }
            tickable.onPhysicTick(delta);
        });
    }

    private createLoop(speed: number, timeToFirstTick = this.scene.tickIntervalMs) {
        if (timeToFirstTick != this.scene.tickIntervalMs) {
            const firstTickMs = timeToFirstTick >> speed;
            setTimeout(() => {
                this.tick(this);
                this.#interval=setInterval(this.tick, this.scene.tickIntervalMs >> speed, this)
            }, firstTickMs);
        }
        else
            this.#interval = setInterval(this.tick , timeToFirstTick >> speed, this);
    }
    timeUntillTick = 0;
    #tickDeltaWhenStateChange = 0;
    set gameSpeed(value: number) {
        clearInterval(this.#interval);
        this.timeUntillTick = this.scene.tickIntervalMs - this.#tickDeltaWhenStateChange;
        if (this.#gameSpeed >= 0) {
            this.#tickDeltaWhenStateChange = (new Date().getTime() - this.scene.physics.lastTickTimeMs) << this.#gameSpeed
        }
        this.#gameSpeed = value;
        if (value >= 0)
            this.createLoop(0,this.timeUntillTick); //for now psysic is always run on constant speed
    }

    constructor(private scene:TerraScene) {
        this.createLoop(0);
    }
}
