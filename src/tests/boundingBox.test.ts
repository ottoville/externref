import { describe, beforeAll, it, expect } from '@jest/globals'

import { Box } from "../GPU/Meshes/Box.js";
import { Engine } from "../engine.js";
import fs from 'fs';


describe('Bounding box ', function () {
    let engine: Engine | void;
    beforeAll(async () => {
        engine = await Engine.initEngine(undefined, (e) => {
            console.log('error', e.message);
        }, {
            rust: fs.readFileSync('../node/wasm32-unknown-unknown/debug/engine.wasm'),
            collider: fs.readFileSync('../wwwroot/collider/colliderSimdO.wasm')
        });
    }, 10000);
    it('Update scale, translation and rotation', function () {
        const b = new Box({ can_collide: false, label: 'bigbox' });
        b.update_scale(500, 500, 500);
        b.translation = [123, 1000, 123];
        b.update_rotation(Math.sin(1.1), 0, 0, Math.cos(1.1));
        //@ts-expect-error pointer is only for unit test
        const minBounding = new Float32Array(engine.memory.buffer, engine.rust.bounding_min_pointer(b.ptr), 3);
        //@ts-expect-error pointer is only for unit test
        const maxBounding = new Float32Array(engine.memory.buffer, engine.rust.bounding_max_pointer(b.ptr), 3);
        expect(minBounding[0]).toStrictEqual(-377);
        expect(minBounding[1]).toStrictEqual(301.50128173828125);
        expect(minBounding[2]).toStrictEqual(-575.4987182617188);


        expect(maxBounding[0]).toStrictEqual(623);
        expect(maxBounding[1]).toStrictEqual(1698.498779296875);
        expect(maxBounding[2]).toStrictEqual(821.4987182617188);

    });

})