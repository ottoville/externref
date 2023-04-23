import { OctaSphere, type OctaSphereProps } from "./OctaSphere.js";
import type { Scene } from "../../Scene.js";
import type { Engine } from "../../engine.js";
declare const engine: Engine;

let uid = 0;

export class RoundCuboid extends OctaSphere {
    constructor(
        {
            width = 0,
            height = 0,
            depth = 0
        }: OctaSphereProps,
        {
            label = 'RoundCuboid' + (uid++),
            can_collide = false,
            fixed = false,
            borderRadius = 1,
            scenes
        }: {
            label?: string,
            can_collide?: boolean,
            fixed?: boolean,
            borderRadius?: number,
            scenes?: Scene[]
        }
    ) {
        super(
            {
                width: width / borderRadius,
                height: height / borderRadius,
                depth: depth / borderRadius
            },
            label, can_collide, fixed, scenes)
    }
    override create_collider() {
        const max = Math.max(this.width, this.height, this.depth) * 0.5 + 1;
        const normalizedWidth = this.width / max;
        const normalizedHeight = this.height / max;
        const normalizedDepth = this.depth / max;
        const normalizedRadius = 1 / max;
        return engine.rust.create_cuboid_collider(
            normalizedWidth * this.scale_x * 0.5,
            normalizedHeight * this.scale_y * 0.5,
            normalizedDepth * this.scale_z * 0.5,
            normalizedRadius * this.scale_x, false);

    }
}
