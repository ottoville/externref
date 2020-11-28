import type { worldPosition } from "./traits/worldPosition";
import type { Engine } from "./engine";

export interface hasPhysics {
    onPhysicTick: (time: number) => void
    worldPosition: worldPosition
}


/*
 * One real life second = One game minute
 * Gametime is saved in minutes.
 * */


export class Physics {
    tickables: Set<hasPhysics> = new Set();
    lastTickTimeMs: number = new Date().getTime();
    #gameSpeed = 0;
    tickTime = 21600;  //6 hours
    #interval: number = 0;
    tickIntervalMs = 1000;

    get physicTime() {
        if (this.#gameSpeed >= 0) {
            const timestamp = new Date().getTime();
            if (this.lastStateChangeTime > this.lastTickTimeMs) {
                var delta = (timestamp - this.lastStateChangeTime << this.#gameSpeed)+ this.#tickDeltaWhenStateChange
            } else {
                var delta = (timestamp - this.lastTickTimeMs) << this.#gameSpeed // get the delta time since last tick
            }
        }
        else
            var delta = (this.lastStateChangeTime - this.lastTickTimeMs) << this.#gameSpeed;

        return (this.tickTime + (delta/1000));
    }
    private tick(me: Physics) {
        const timestamp = new Date().getTime();
        if (me.lastStateChangeTime > me.lastTickTimeMs) {
            var delta = ((timestamp - me.lastStateChangeTime) << me.#gameSpeed) + me.#tickDeltaWhenStateChange
        } else {
            var delta = (timestamp - me.lastTickTimeMs) << me.#gameSpeed; // get the delta time since last tick
        }
        me.lastTickTimeMs = timestamp;
        me.tickTime += delta / 1000;

       // console.log(delta / me.scene.tickIntervalMs);

        me.tickables.forEach(tickable => {
            tickable.onPhysicTick(delta);
            
            const currentTranslation = tickable.worldPosition.translation;
            if (tickable.worldPosition.translationDelta[0] !== 0 || tickable.worldPosition.translationDelta[1] !== 0 || tickable.worldPosition.translationDelta[2] !== 0) {
                tickable.worldPosition.translation.set([
                    currentTranslation[0] + tickable.worldPosition.translationDelta[0],
                    currentTranslation[1] + tickable.worldPosition.translationDelta[1],
                    currentTranslation[2] + tickable.worldPosition.translationDelta[2]
                ]);
            }
        });
    }

    private createLoop(speed: number, timeToFirstTick = this.tickIntervalMs) {
        if (timeToFirstTick != this.tickIntervalMs) {
            const firstTickMs = timeToFirstTick >> speed;
            setTimeout(() => {
                this.tick(this);
                this.#interval = setInterval(this.tick, this.tickIntervalMs >> speed, this)
            }, firstTickMs);
        }
        else
            this.#interval = setInterval(this.tick , timeToFirstTick >> speed, this);
    }
    #lastStateChangeGameTime = BigInt(216000000); //21600 * 1000; //6 hours
    get gameTime() {
        if (this.gameSpeed < 0)
            return this.#lastStateChangeGameTime;
        var interval = new Date().getTime() - this.lastStateChangeTime;
        return this.#lastStateChangeGameTime + (BigInt((interval * 60) << this.gameSpeed));
    }
    lastStateChangeTime = new Date().getTime()
    timeUntillTick = 0;
    #tickDeltaWhenStateChange = 0;
    set gameSpeed(value: number) {
        console.log('set gameSpeed', value)
        this.#lastStateChangeGameTime = this.gameTime;
        this.lastStateChangeTime = new Date().getTime();

        clearInterval(this.#interval);
        this.timeUntillTick = this.tickIntervalMs - this.#tickDeltaWhenStateChange;
        if (this.#gameSpeed >= 0) {
            this.#tickDeltaWhenStateChange = (new Date().getTime() - this.lastTickTimeMs) << this.#gameSpeed
        }
        this.#gameSpeed = value;
        if (value >= 0)
            this.createLoop(0,this.timeUntillTick); //for now psysic is always run on constant speed
    }
    get gameSpeed() {
        return this.#gameSpeed;
    }
    constructor(private engine:Engine) {
        //this.createLoop(0);
    }

}
