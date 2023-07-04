import { MeshProperties, OctaSphere, type OctaSphereProps } from './OctaSphere.js';
import type { Engine } from '../../engine.js';
declare const engine: Engine;

let uid = 0;

export class RoundCuboid extends OctaSphere {
    constructor(
        {
            width = 0,
            height = 0,
            depth = 0,
        }: OctaSphereProps,
        {
            can_collide = false,
            borderRadius = 1,
        }: {
            can_collide?: boolean,
            borderRadius?: number,
        },
        meshProperties: MeshProperties
    ) {
        super(
            {
                depth: depth / borderRadius,
                height: height / borderRadius,
                width: width / borderRadius,

            },
            {
                label: 'RoundCuboid' + (uid++),
                ...meshProperties,
            },
            can_collide);
    }
    override create_collider() {
        const max = Math.max(this.width,
            this.height,
            this.depth) * 0.5 + 1;
        const normalizedWidth = this.width / max;
        const normalizedHeight = this.height / max;
        const normalizedDepth = this.depth / max;
        const normalizedRadius = 1 / max;
        return engine.rust.create_cuboid_collider(
            normalizedWidth * this.scale_x * 0.5,
            normalizedHeight * this.scale_y * 0.5,
            normalizedDepth * this.scale_z * 0.5,
            normalizedRadius * this.scale_x,
            false);

    }
}
