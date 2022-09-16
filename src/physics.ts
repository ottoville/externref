import type { DataNode } from "./nodes/DataNode.js";
import type { MainNode } from "./MainNode.js";
import type { Engine } from "./engine.js";

const MIN_TICK_DELTA = 110;

const GRAVITY = 9.80665;

//let Epsilon = 0.001;

/*
 * One real life second = One game minute
 * Gametime is saved in minutes.
 * */

const tmp_vector:[number,number,number]=[0,0,0];
export class Physics {
    #lastTickTimeMs: number = new Date().getTime();
    #lastStateChangeTime = new Date().getTime();
    #gameSpeed = 0;
    #interval: null | ReturnType<typeof setTimeout> = null;
    #lastStateChangeGameTime = BigInt(21600000); //21600 * 1000; //6 hours
    #timeUntillTick = 0;
    #tickDeltaWhenStateChange = 0;
    movables: MainNode[] = []; //Stuff that moves without physic, eg. sun.
    tickables: DataNode[] = []; //Stuff that moves and have collision check
    tickTime = 21600;  //6 hours
    tickIntervalMs = 16.6;
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
    onPhysicTick: Set<(delta:number) => void> = new Set();
    /*
        There is a flaw in #tick function.
        When tab is background its not getting called and delta is growing very large.
        Large delta results large gravity, collision detector will see bigger impact.
    */
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
        const delta_multiplier =  1000 / delta;
        const dt_half_sqrt=dt*dt*0.5;
        const dt_half=dt*0.5;
        /*
            Min delta = 0,0166 = 60fps/s.
            If higher fps is wanted, then collider displacementVector must be updated to closer,
            otherwise gravity will pull objects that are ground causing jumping.

        */
        this.engine.rust.physic_tick();
        this.onPhysicTick.forEach(f => f(delta));
        this.movables.forEach(movable => {
            if (movable.onPhysicTick)
                movable.onPhysicTick(delta);
            const velocity = movable.velocity;
            if (velocity[0] !== 0 || velocity[1] !== 0 || velocity[2] !== 0) {
                const currentTranslation = movable.translation;
                movable.translation = [
                    currentTranslation[0] + velocity[0],
                    currentTranslation[1] + velocity[1],
                    currentTranslation[2] + velocity[2]
                ];
            }
        });
        /*
            TODO:
             - acceleration etc setters update dynamic buffer. So it is updated multiple times on loop.
        */
        for(let i = 0; i<this.tickables.length; i++) {
            const tickable=this.tickables[i]!;
            //if (tickable.onPhysicTick) //@ts-ignore
            //    tickable.onPhysicTick(delta);

            const velocity = tickable.velocity;
           /* if(velocity[0] > 0 || velocity[1] > 0 || velocity[2] > 0) {
                // TODO: take account to Y axis also.
                let speed = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
                if(speed > 0)
                tickable.velocity = [
                    velocity[0] - 0.1,
                    velocity[1],
                    velocity[2] - 0.1
                ]
            }*/
            const wantedVelocityPerDelta=tmp_vector;
            wantedVelocityPerDelta[0]=velocity[0]*dt + tickable.acceleration2[0]*dt_half_sqrt 
            wantedVelocityPerDelta[1]=velocity[1]*dt + tickable.acceleration2[1]*dt_half_sqrt
            wantedVelocityPerDelta[2]=velocity[2]*dt + tickable.acceleration2[2]*dt_half_sqrt;
            const motionFrictionAcceleration:[number,number,number]=[0,0,0]
            const translation=tickable.translation;
           if(wantedVelocityPerDelta[0] !== 0 || wantedVelocityPerDelta[1] !== 0 || wantedVelocityPerDelta[2] !== 0) {
                const finalPosition = tickable.checkCollide([
                    wantedVelocityPerDelta[0],
                    wantedVelocityPerDelta[1],
                    wantedVelocityPerDelta[2]
                ]);
                if (tickable.colliding_character) {
                    tickable.onCollideCharacter(false)
                    const newVelocityDelta:[number,number,number] = [
                        (finalPosition[0] - translation[0]),
                        (finalPosition[1] - translation[1]),
                        (finalPosition[2] - translation[2])
                    ]
                    if(newVelocityDelta[0] !== 0 || newVelocityDelta[1] !== 0 || newVelocityDelta[2] !== 0) {
                        if(tickable.last_velocity[0] === 0 || tickable.last_velocity[1] === 0 || tickable.last_velocity[2] === 0) {
                            // Apply friction when object is not moving
                           // friction=true;
                        }
                        tickable.last_velocity[0] = newVelocityDelta[0] * delta_multiplier;
                        tickable.last_velocity[1] = newVelocityDelta[1] * delta_multiplier;
                        tickable.last_velocity[2] = newVelocityDelta[2] * delta_multiplier;
                        // eslint-disable-next-line no-constant-condition
                        /*if(friction) {
                            if(tickable.speed < tickable.grip*1.8) {
                                console.log('stop')
                                //Friction prevents object from start moving.
                                tickable.last_velocity[0]=0;
                                tickable.last_velocity[1]=0;
                                tickable.last_velocity[2]=0;
                                newVelocityDelta[0]=0;
                                newVelocityDelta[1]=0;
                                newVelocityDelta[2]=0;
                            }
                        }*/
                    }
                    else {
                        tickable.last_velocity[0] = 0;
                        tickable.last_velocity[1] = 0;
                        tickable.last_velocity[2] = 0;
                    }
                    // Calculate correct acceleration so new position can be forced throught velocity
                    tickable.acceleration2[0] = (newVelocityDelta[0]-velocity[0]*dt)/dt_half_sqrt;
                    tickable.acceleration2[1] = (newVelocityDelta[1]-velocity[1]*dt)/dt_half_sqrt;
                    tickable.acceleration2[2] = (newVelocityDelta[2]-velocity[2]*dt)/dt_half_sqrt;

                /*
                    TODO: friction is now set higher in x and z because human cannot brake otherwise.
                */
                    motionFrictionAcceleration[0] = -tickable.last_velocity[0]*tickable.grip,
                    motionFrictionAcceleration[1] = -tickable.last_velocity[1]*tickable.grip,
                    motionFrictionAcceleration[2] = -tickable.last_velocity[2]*tickable.grip;
                } else {
                    tickable.last_velocity[0] = wantedVelocityPerDelta[0] * delta_multiplier;
                    tickable.last_velocity[1] = wantedVelocityPerDelta[1] * delta_multiplier;
                    tickable.last_velocity[2] = wantedVelocityPerDelta[2] * delta_multiplier;
                }
                tickable.translation=[
                    finalPosition[0],
                    finalPosition[1],
                    finalPosition[2]
                ];
            }
            tickable.last_acceleration[0]=tickable.acceleration2[0];
            tickable.last_acceleration[1]=tickable.acceleration2[1];
            tickable.last_acceleration[2]=tickable.acceleration2[2];

            tickable.acceleration2[0] = motionFrictionAcceleration[0] + tickable.impulse[0];
            tickable.acceleration2[1] = motionFrictionAcceleration[1] + tickable.impulse[1] -(tickable.hasGravity?GRAVITY:0);
            tickable.acceleration2[2] = motionFrictionAcceleration[2] + tickable.impulse[2];

            tickable.impulse[0]=0;
            tickable.impulse[1]=0;
            tickable.impulse[2]=0;

            tickable.velocity=[
                velocity[0] + (tickable.last_acceleration[0]+tickable.acceleration2[0])*dt_half,
                velocity[1] + (tickable.last_acceleration[1]+tickable.acceleration2[1])*dt_half,
                velocity[2] + (tickable.last_acceleration[2]+tickable.acceleration2[2])*dt_half,
            ];
            //TODO: Update only if neeeded
            tickable.update_dynamic_buffer();
        }
        if (realDeltaInGameTime > MIN_TICK_DELTA) {
            // Withtimeout execution is returned to event loop, allowing inputs before next tick
            // TODO: nested timeout forces 4ms delay
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

        this.#interval && clearTimeout(this.#interval);
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
    constructor(private engine:Engine) {
        this.gameSpeed = 0;
    }

}
