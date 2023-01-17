import { BufLayout } from '../BindGroupLayout.js';
import type { Terrain } from '../../world/terrain.js';

export const getHeightAtCoordinates = (
    settings: typeof Terrain.settings,
    slopes: BufLayout,
    facet12: BufLayout) => /* wgsl */ `
fn getHeightAtCoordinates(xz:vec2<f32>) -> f32 {
    let col:u32 = u32(floor((xz.x + ${settings.maxXZ[0]}) * ${settings.subdivisions[0]} / ${settings.size[0]}));
    let row:u32 = u32(floor(- (xz.y + ${settings.maxXZ[1]}) * ${settings.subdivisions[1]} / ${settings.size[0]} + ${settings.subdivisions[0]}));
    let slope:f32 = f32(${slopes.variableName}.numbers[row * ${settings.subdivisions[0]} + col]);
    var norm:vec3<f32>;
    var d:f32;
    if(xz.y < -1.0 * xz.x + slope) {
        norm = ${facet12.variableName}.plane[row * ${settings.subdivisions[0]} + col].norm;
        d = ${facet12.variableName}.plane[row * ${settings.subdivisions[0]} + col].d;
    } else {
        var index:u32=${settings.facetSize} + u32(row * ${settings.subdivisions[0]} + col);
        norm = ${facet12.variableName}.plane[index].norm;
        d = ${facet12.variableName}.plane[index].d;
    }
    return -(norm.x * f32(xz.x) + norm.z * f32(xz.y) + d) / norm.y;
 };
`