import type { MainNode } from "./TerraNode.js";
import type { Engine } from "engine";
declare const engine:Engine;

//let Epsilon = 0.001;
export interface hasPhysics {
    onPhysicTick: (time: number) => void
    hasGravity:boolean;
    checkCollide?(): Promise<void>;
}
/*
 * One real life second = One game minute
 * Gametime is saved in minutes.
 * */


export class Physics {
    #lastTickTimeMs: number = new Date().getTime();
    #lastStateChangeTime = new Date().getTime();
    #gameSpeed = 0;
    #interval = 0;
    #lastStateChangeGameTime = BigInt(21600000); //21600 * 1000; //6 hours
    #timeUntillTick = 0;
    #tickDeltaWhenStateChange = 0;

    tickables: Set<MainNode & hasPhysics> = new Set();
    tickTime = 21600;  //6 hours
    tickIntervalMs = 100;
    #realMSingameSecond = 1000 as const; //1000 millisecond in real time = 1 second in game time (on normal speed)
    get physicTime() {
        if (this.#gameSpeed >= 0) {
            const timestamp = new Date().getTime();
            if (this.#lastStateChangeTime > this.#lastTickTimeMs) {
                var delta = (timestamp - this.#lastStateChangeTime << this.#gameSpeed)+ this.#tickDeltaWhenStateChange
            } else {
                var delta = (timestamp - this.#lastTickTimeMs) << this.#gameSpeed // get the delta time since last tick
            }
        }
        else
            var delta = (this.#lastStateChangeTime - this.#lastTickTimeMs) << this.#gameSpeed;

        return (this.tickTime + (delta/this.#realMSingameSecond));
    }
    #tick = () => {
        const timestamp = new Date().getTime();
        if (this.#lastStateChangeTime > this.#lastTickTimeMs) {
            var delta = ((timestamp - this.#lastStateChangeTime) << this.#gameSpeed) + this.#tickDeltaWhenStateChange
        } else {
            var delta = (timestamp - this.#lastTickTimeMs) << this.#gameSpeed; // get the delta time since last tick
        }
        this.#lastTickTimeMs = timestamp;
        this.tickTime += delta / this.#realMSingameSecond;

        this.tickables.forEach(async tickable => {
            tickable.onPhysicTick(delta);
            const velocity=tickable.get_velocity();
            if (tickable.hasGravity) {
                tickable.SetTranslationDelta([
                    velocity[0],
                    Math.max(velocity[1] - 9.81/1000 * delta,-1),  //TODO: Take account game speed //TODO Remove cap
                    velocity[2]]
                )
            }
            const currentTranslation = tickable.get_translation();
            if(tickable.checkCollide) {
                await tickable.checkCollide();
                if (engine.collider.rust.collision_not_found) {
                    currentTranslation.set(engine.collider.finalPosition); //TODO now it only supports one collider.
                    //engine.mainCamera.position=engine.collider.finalPosition; //TODO: move to human.ts
                }
            }
            else {
                if (velocity[0] !== 0 || velocity[1] !== 0 || velocity[2] !== 0) {
                    currentTranslation.set([
                        currentTranslation[0] + velocity[0],
                        currentTranslation[1] + velocity[1],
                        currentTranslation[2] + velocity[2]
                    ]);
                }
            }
        });
    }

    private createLoop(speed: number, timeToFirstTick = this.tickIntervalMs) {
        if (timeToFirstTick != this.tickIntervalMs) {
            const firstTickMs = timeToFirstTick >> speed;
            setTimeout(() => {
                this.#tick();
                this.#interval = setInterval(this.#tick, this.tickIntervalMs >> speed)
            }, firstTickMs);
        }
        else
            this.#interval = setInterval(this.#tick , timeToFirstTick >> speed);
    }
    get gameTime() {
        if (this.gameSpeed < 0)
            return this.#lastStateChangeGameTime;
        var interval = new Date().getTime() - this.#lastStateChangeTime;
        return this.#lastStateChangeGameTime + (BigInt((interval * 60) << this.gameSpeed));
    }
    //Called from blazor
    setGameSpeed(value: {
        gameSpeed: number
        lastStateChangeGameTime: number
        lastStateChangeTime: number
    }) {
        this.gameSpeed = value.gameSpeed;
    }
    set gameSpeed(value: number) {
        this.#lastStateChangeGameTime = this.gameTime;
        this.#lastStateChangeTime = new Date().getTime();

        clearInterval(this.#interval);
        this.#timeUntillTick = this.tickIntervalMs - this.#tickDeltaWhenStateChange;
        if (this.#gameSpeed >= 0) {
            this.#tickDeltaWhenStateChange = (new Date().getTime() - this.#lastTickTimeMs) << this.#gameSpeed
        }
        this.#gameSpeed = value;
        if (value >= 0)
            this.createLoop(0,this.#timeUntillTick); //for now psysic is always run on constant speed
    }
    get gameSpeed() {
        return this.#gameSpeed;
    }
    constructor() {
        this.gameSpeed = 0;
    }

}
