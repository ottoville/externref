import type { DataNode } from './nodes/DataNode.js';
import type { MainNode } from './MainNode.js';
import type { Engine } from './engine.js';

const MIN_TICK_DELTA = 100;
const GRAVITY = 9.80665;

/**
 * One second real life is 60 second in game
 */
const gameSecondsPerMs = 0.06; //60 / 1000;

const tmp_vector: [number, number, number] = [0, 0, 0];
export class Physics {
  #lastTickTimeMsInGameTime: number = Date.now();
  #lastTickTimeMs: number = Date.now();
  #gameSpeed = -1;
  #newGameSpeed = 1;
  /**
   * Stuff that moves without physic, eg. sun.
   */
  movables: MainNode[] = [];
  /**
   * Stuff that moves and have collision check
   */
  tickables: DataNode[] = [];
  /**
   * Seconds since first day in the game
   * One real life second = One game minute
   * Gametime is saved in seconds.
   */
  tickTime = 21600; //6 hours
  readonly tickIntervalMs = 16.6;
  #realMSingameSecond = 1000 as const; //1000 millisecond in real time = 1 second in game time (on normal speed)
  get physicTime() {
    if (this.#gameSpeed >= 0) {
      const timestamp = Date.now();
      var delta =
        (timestamp - this.#lastTickTimeMsInGameTime) * this.#gameSpeed; // get the delta time since last tick
    } else var delta = 0;

    return this.tickTime + delta / this.#realMSingameSecond;
  }
  /*
        There is a flaw in #tick function.
        When tab is background its not getting called and delta is growing very large.
        Large delta results large gravity, collision detector will see bigger impact.
    */
  #tick = () => {
    if (this.#newGameSpeed !== this.#gameSpeed) {
      // Change the gamespeed only inside tick to prevent multiple ticks executing after pause if user repeatly put on pause and back
      this.#gameSpeed = this.#newGameSpeed;
      if (this.#gameSpeed === -1) {
        // Game has paused
        return;
      }
    }
    const timestamp = Date.now();
    const delta0 = timestamp - this.#lastTickTimeMs;
    this.#lastTickTimeMs = timestamp;
    var deltaWithGameSpeed = delta0 * this.#gameSpeed;
    if (delta0 < 0) {
      throw new Error('Delta cannot be negative');
    }

    if (deltaWithGameSpeed > MIN_TICK_DELTA) {
      deltaWithGameSpeed = MIN_TICK_DELTA;
    }
    this.#lastTickTimeMsInGameTime += deltaWithGameSpeed;

    this.tickTime += deltaWithGameSpeed * gameSecondsPerMs;
    const dt = deltaWithGameSpeed / 1000;
    const delta_multiplier = 1000 / deltaWithGameSpeed;
    const dt_half_sqrt = dt * dt * 0.5;
    const dt_half = dt * 0.5;
    /*
            Min delta = 0,0166 = 60fps/s.
            If higher fps is wanted, then collider displacementVector must be updated to closer,
            otherwise gravity will pull objects that are ground causing jumping.

        */
    this.engine.rust.physic_tick(deltaWithGameSpeed);
    this.movables.forEach((movable) => {
      const velocity = movable.getVelocityFromId();
      if (velocity[0] !== 0 || velocity[1] !== 0 || velocity[2] !== 0) {
        const currentTranslation = movable.getTranslationFromId();
        movable.setTranslation([
          currentTranslation[0] + velocity[0],
          currentTranslation[1] + velocity[1],
          currentTranslation[2] + velocity[2],
        ]);
      }
    });

    /*
            TODO:
             - acceleration etc setters update dynamic buffer. So it is updated multiple times on loop.
        */
    for (let i = 0; i < this.tickables.length; i++) {
      const tickable = this.tickables[i]!;

      const velocity = tickable.getVelocityFromId();
      const wantedVelocityPerDelta = tmp_vector;
      wantedVelocityPerDelta[0] =
        velocity[0] * dt + tickable.acceleration2[0] * dt_half_sqrt;
      wantedVelocityPerDelta[1] =
        velocity[1] * dt + tickable.acceleration2[1] * dt_half_sqrt;
      wantedVelocityPerDelta[2] =
        velocity[2] * dt + tickable.acceleration2[2] * dt_half_sqrt;
      const motionFrictionAcceleration: [number, number, number] = [0, 0, 0];
      const oldT = tickable.getTranslationFromId();
      const oldTanslation = [oldT[0], oldT[1], oldT[2]] as unknown as readonly [
        number,
        number,
        number,
      ];
      if (
        wantedVelocityPerDelta[0] !== 0 ||
        wantedVelocityPerDelta[1] !== 0 ||
        wantedVelocityPerDelta[2] !== 0
      ) {
        tickable.checkCollide(dt, [
          wantedVelocityPerDelta[0],
          wantedVelocityPerDelta[1],
          wantedVelocityPerDelta[2],
        ]);
        const finalPosition = tickable.getTranslationFromId();

        if (tickable.colliding_character) {
          tickable.onCollideCharacter(false);

          const newVelocityDelta: [number, number, number] = [
            finalPosition[0] - oldTanslation[0],
            finalPosition[1] - oldTanslation[1],
            finalPosition[2] - oldTanslation[2],
          ];
          if (
            newVelocityDelta[0] !== 0 ||
            newVelocityDelta[1] !== 0 ||
            newVelocityDelta[2] !== 0
          ) {
            tickable.last_velocity[0] = newVelocityDelta[0] * delta_multiplier;
            tickable.last_velocity[1] = newVelocityDelta[1] * delta_multiplier;
            tickable.last_velocity[2] = newVelocityDelta[2] * delta_multiplier;
          } else {
            tickable.last_velocity[0] = 0;
            tickable.last_velocity[1] = 0;
            tickable.last_velocity[2] = 0;
          }
          // Calculate correct acceleration so new position can be forced throught velocity
          tickable.acceleration2[0] =
            (newVelocityDelta[0] - velocity[0] * dt) / dt_half_sqrt;
          tickable.acceleration2[1] =
            (newVelocityDelta[1] - velocity[1] * dt) / dt_half_sqrt;
          tickable.acceleration2[2] =
            (newVelocityDelta[2] - velocity[2] * dt) / dt_half_sqrt;

          motionFrictionAcceleration[0] =
            -tickable.last_velocity[0] * tickable.grip;
          motionFrictionAcceleration[1] =
            -tickable.last_velocity[1] * tickable.grip;
          motionFrictionAcceleration[2] =
            -tickable.last_velocity[2] * tickable.grip;
        } else {
          tickable.last_velocity[0] =
            wantedVelocityPerDelta[0] * delta_multiplier;
          tickable.last_velocity[1] =
            wantedVelocityPerDelta[1] * delta_multiplier;
          tickable.last_velocity[2] =
            wantedVelocityPerDelta[2] * delta_multiplier;
        }
      }
      tickable.last_acceleration[0] = tickable.acceleration2[0];
      tickable.last_acceleration[1] = tickable.acceleration2[1];
      tickable.last_acceleration[2] = tickable.acceleration2[2];
      const impulse = tickable.impulse;
      tickable.acceleration2[0] = motionFrictionAcceleration[0] + impulse[0]!;
      tickable.acceleration2[1] =
        motionFrictionAcceleration[1] +
        impulse[1]! -
        (tickable.hasGravity ? GRAVITY : 0);
      tickable.acceleration2[2] = motionFrictionAcceleration[2] + impulse[2]!;

      impulse[0] = 0;
      impulse[1] = 0;
      impulse[2] = 0;

      tickable.setVelocityFromId([
        velocity[0] +
          (tickable.last_acceleration[0] + tickable.acceleration2[0]) * dt_half,
        velocity[1] +
          (tickable.last_acceleration[1] + tickable.acceleration2[1]) * dt_half,
        velocity[2] +
          (tickable.last_acceleration[2] + tickable.acceleration2[2]) * dt_half,
      ]);
    }
    if (deltaWithGameSpeed === MIN_TICK_DELTA) {
      // Withtimeout execution is returned to event loop, allowing inputs before next tick
      // TODO: nested timeout forces 4ms delay
      setTimeout(this.#tick, 0);
    } else {
      setTimeout(this.#tick, this.tickIntervalMs - (Date.now() - timestamp));
    }
  };

  set gameSpeed(value: number) {
    if (Number.isNaN(value)) throw new Error('gameSpeed must be number');
    this.#newGameSpeed = value;
    if (this.#gameSpeed === -1 && value >= 0) {
      this.#tick(); //for now psysic is always run on constant speed
    }
  }
  get gameSpeed() {
    return this.#gameSpeed;
  }
  constructor(private engine: Engine) {
    this.gameSpeed = 1;
  }
}
