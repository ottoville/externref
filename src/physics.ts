import type { Engine } from "engine";
import type { DataNode } from "DataNode.js";
import type { MainNode } from "MainNode.js";
declare const engine:Engine;

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
    movables:MainNode[] = []; //Stuff that moves without physic, eg. sun.
    tickables: ({ checkCollide(newPosition:readonly [number,number,number]): void } & DataNode)[] = []; //Stuff that moves and have collision check
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
    /*
        There is a flaw in #tick function.
        When tab is background its not getting called and delta is growing very large.
        Large delta results large gravity, collision detector will see bigger impact.
    */
    #tick = () => {
        const timestamp = new Date().getTime();
        if (this.#lastStateChangeTime > this.#lastTickTimeMs) {
            var delta = ((timestamp - this.#lastStateChangeTime) << this.#gameSpeed) + this.#tickDeltaWhenStateChange
        } else {
            var delta = (timestamp - this.#lastTickTimeMs) << this.#gameSpeed; // get the delta time since last tick
        }
        //console.log('delta',new Date().getSeconds(), delta);
        this.#lastTickTimeMs = timestamp;
        this.tickTime += delta / this.#realMSingameSecond;
        this.movables.forEach(movable => {
            if(movable.onPhysicTick)
                movable.onPhysicTick(delta);
            const velocity=movable.get_velocity();
            if (velocity[0] !== 0 || velocity[1] !== 0 || velocity[2] !== 0) {
                const currentTranslation = movable.get_translation();
                currentTranslation.set([
                    currentTranslation[0] + velocity[0],
                    currentTranslation[1] + velocity[1],
                    currentTranslation[2] + velocity[2]
                ]);
                movable.update_dynamic_buffer(engine.rustEngine);
            }
        });
        this.tickables.forEach(tickable => {
            if(tickable.onPhysicTick)
                tickable.onPhysicTick(delta);
            //@ts-ignore
            const velocity=tickable.get_velocity();
            const currentTranslation = tickable.get_translation();

            if (tickable.hasGravity) {
                tickable.SetTranslationDelta([
                    velocity[0],
                    Math.max(velocity[1] - 9.81/1000 * delta,-1000),  //TODO: Take account game speed //TODO Set cap to some realistic value
                    velocity[2]]
                )
            }
            
                // TODO: Only check collision if some of both object has moved
                if(currentTranslation[0]!==0 || currentTranslation[1]!==0 || currentTranslation[2]!==0) {
                    const newPosition= [
                        currentTranslation[0]+velocity[0]/1000*delta,
                        currentTranslation[1]+velocity[1]/1000*delta,
                        currentTranslation[2]+velocity[2]/1000*delta
                    ] as const
                    tickable.checkCollide(newPosition);
                    //TODO: What if collision is found (collider cannot resolve position without collision)
                    if (engine.collider.rust.collision_not_found) {
                        //Velocity in m/delta, not m/s
                        //TODO: If the was not collision at all, these calculations are not needed
                        const newVelocity = [
                            engine.collider.finalPosition[0]-currentTranslation[0],
                            engine.collider.finalPosition[1]-currentTranslation[1],
                            engine.collider.finalPosition[2]-currentTranslation[2]
                        ] as const
                        velocity.set([
                            newVelocity[0]*1000/delta,
                            newVelocity[1]*1000/delta,
                            newVelocity[2]*1000/delta
                        ])
                        if(tickable.label==='greenbox')
                        console.log('velocity', ...velocity);
                        currentTranslation.set(engine.collider.finalPosition); //TODO now it only supports one collider.
                        tickable.update_dynamic_buffer(engine.rustEngine);
                        // engine.mainCamera.position=engine.collider.finalPosition; //TODO: move to human.ts
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
