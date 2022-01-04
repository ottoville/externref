import type { Engine } from "./engine";
import type { DataNode } from "./DataNode.js";
import type { MainNode } from "./MainNode.js";
declare const engine: Engine;
const MIN_TICK_DELTA = 110;

const GRAVITY = 9.80665;

//let Epsilon = 0.001;

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
    movables: MainNode[] = []; //Stuff that moves without physic, eg. sun.
    tickables: ({ checkCollide(velocityPerDelta: readonly [number, number, number]): void } & DataNode)[] = []; //Stuff that moves and have collision check
    tickTime = 21600;  //6 hours
    tickIntervalMs = 16;
    #realMSingameSecond = 1000 as const; //1000 millisecond in real time = 1 second in game time (on normal speed)
    get physicTime() {
        if (this.#gameSpeed >= 0) {
            const timestamp = new Date().getTime();
            if (this.#lastStateChangeTime > this.#lastTickTimeMs) {
                var delta = (timestamp - this.#lastStateChangeTime << this.#gameSpeed) + this.#tickDeltaWhenStateChange
            } else {
                var delta = (timestamp - this.#lastTickTimeMs) << this.#gameSpeed // get the delta time since last tick
            }
        }
        else
            var delta = (this.#lastStateChangeTime - this.#lastTickTimeMs) << this.#gameSpeed;

        return (this.tickTime + (delta / this.#realMSingameSecond));
    }

    /*
        There is a flaw in #tick function.
        When tab is background its not getting called and delta is growing very large.
        Large delta results large gravity, collision detector will see bigger impact.
    */
    #deltaOld=1
    #tick = () => {
        const timestamp = Date.now();
        if (this.#lastStateChangeTime > this.#lastTickTimeMs) {
            var realDeltaInGameTime = ((timestamp - this.#lastStateChangeTime) << this.#gameSpeed) + this.#tickDeltaWhenStateChange
        } else {
            var realDeltaInGameTime = (timestamp - this.#lastTickTimeMs) << this.#gameSpeed; // get the delta time since last tick
        }
        if (realDeltaInGameTime > MIN_TICK_DELTA) {
            var delta = 100;
            this.#lastTickTimeMs += delta;
            //const queueLength = realDeltaInGameTime / 100;
            /*if(queueLength > 100) {
                delta = realDeltaInGameTime;
            }*/
        } else {
            var delta = realDeltaInGameTime;
            this.#lastTickTimeMs = timestamp;
        }

        this.tickTime += delta / this.#realMSingameSecond;
        const dt = delta / 1000;

        const delta_multiplier = 1000 / delta;
        this.movables.forEach(movable => {
            if (movable.onPhysicTick)
                movable.onPhysicTick(delta);
            const velocity = movable.velocity;
            if (velocity[0] !== 0 || velocity[1] !== 0 || velocity[2] !== 0) {
                const currentTranslation = movable.translation;
                ///console.log('currentTranslation',...currentTranslation)
                currentTranslation.set([
                    currentTranslation[0] + velocity[0],
                    currentTranslation[1] + velocity[1],
                    currentTranslation[2] + velocity[2]
                ]);
                movable.update_dynamic_buffer();
            }
        });
        this.tickables.forEach(tickable => {
            if (tickable.onPhysicTick)
                tickable.onPhysicTick(delta);

            const velocity = tickable.velocity;
            const velocityPerDelta: [number, number, number] = [
                velocity[0] * dt,
                velocity[1] * dt,
                velocity[2] * dt
            ]
            const currentTranslation = tickable.translation;

            // TODO: Only check collision if some of both object has moved
            if (currentTranslation[0] !== 0 || currentTranslation[1] !== 0 || currentTranslation[2] !== 0) {

                if (tickable.hasGravity) {
                    // Todo: Use general acceleration for all calculations
                    var velocityY = tickable.lastVelocityDelta[1]*(dt/this.#deltaOld) + -GRAVITY*dt*dt
                } else {
                    var velocityY = velocityPerDelta[1]
                }
                const scaledVelocity = [
                    velocityPerDelta[0] / engine.collider.radius[0],
                    velocityY / engine.collider.radius[1],
                    velocityPerDelta[2] / engine.collider.radius[2]
                ] as const
                tickable.checkCollide(scaledVelocity);

                //TODO: What if collision is found (collider cannot resolve position without collision)
                if (engine.collider.collision_not_found) {
                    engine.collider.finalPosition[0] *= engine.collider.radius[0]
                    engine.collider.finalPosition[1] *= engine.collider.radius[1]
                    engine.collider.finalPosition[2] *= engine.collider.radius[2]

                    //TODO: If the was not collision at all, these calculations are not needed
                    tickable.lastVelocityDelta = [
                        engine.collider.finalPosition[0] - currentTranslation[0],
                        engine.collider.finalPosition[1] - currentTranslation[1],
                        engine.collider.finalPosition[2] - currentTranslation[2]
                    ] as const
                    tickable.velocity =[
                        tickable.lastVelocityDelta[0] * delta_multiplier,
                        tickable.lastVelocityDelta[1] * delta_multiplier,
                        tickable.lastVelocityDelta[2] * delta_multiplier,
                    ]
                    const translation = tickable.translation;
                    translation.set([
                        translation[0] + tickable.lastVelocityDelta[0],
                        translation[1] + tickable.lastVelocityDelta[1],
                        translation[2] + tickable.lastVelocityDelta[2]
                    ])
                    //currentTranslation.set(engine.collider.finalPosition);
                    tickable.update_dynamic_buffer();
                }
            }
        });
        this.#deltaOld=dt;
        if (realDeltaInGameTime > MIN_TICK_DELTA) {
            // Withtimeout execution is returned to event loop, allowing inputs before next tick
            setTimeout(this.#tick,0);
        } else {
            this.#interval = setTimeout(this.#tick, this.tickIntervalMs - (Date.now() - timestamp))
        }
    }

    private createLoop(speed: number, timeToFirstTick = this.tickIntervalMs) {
        if (timeToFirstTick != this.tickIntervalMs) {
            const firstTickMs = timeToFirstTick >> speed;
            setTimeout(() => {
                this.#tick();
            }, firstTickMs);
        }
        else
            this.#interval = setTimeout(this.#tick, timeToFirstTick);
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

        clearTimeout(this.#interval);
        this.#timeUntillTick = this.tickIntervalMs - this.#tickDeltaWhenStateChange;
        if (this.#gameSpeed >= 0) {
            this.#tickDeltaWhenStateChange = (new Date().getTime() - this.#lastTickTimeMs) << this.#gameSpeed
        }
        this.#gameSpeed = value;
        if (value >= 0)
            this.createLoop(0, this.#timeUntillTick); //for now psysic is always run on constant speed
    }
    get gameSpeed() {
        return this.#gameSpeed;
    }
    constructor() {
        this.gameSpeed = 0;
    }

}
