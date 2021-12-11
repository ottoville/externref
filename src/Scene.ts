import type { DataNode, PickingInfo } from "./DataNode.js";
import type { GPU } from "./GPU.js";
import type { TerraCamera } from "./TerraCamera.js";
import type { Engine } from "./engine.js";
declare const engine:Engine;

let sceneID=1;
export class Scene {
    readonly id=sceneID;
    ready: Promise<any> | undefined;

    constructor(public name: string, public gpu: GPU, public TerraCameras: [TerraCamera] | TerraCamera[], onRenderStart: (scene: Scene) => Promise<any> | undefined) {
        sceneID<<=1;
        engine.scenes.set(name, this);
        TerraCameras.forEach(camera => {
            camera.renderPass.scenes.add(this);
        })

        const groundAndSea = onRenderStart(this);
        this.ready = groundAndSea;
    }
    async collissionCheck(rayFunction: (mesh: DataNode) => any, boundables: IterableIterator<DataNode>, pickResult: PickingInfo | null, fastCheck?: boolean, predicate?: (mesh: DataNode) => boolean): Promise<PickingInfo | null> {
        if (fastCheck) {
            throw ('TODO: fastcheck');
        }
        let boundableMesh: DataNode;
        do {
            const boundable = boundables.next();
            if (boundable.done)
                return new Promise(res => res(pickResult));
            boundableMesh = boundable.value;

        } while (predicate ? !predicate(boundableMesh) : false);

        const ray = rayFunction(boundableMesh);
        /*const result =*/ await boundableMesh.intersectsRay(ray);
        //TODO
        return null;
        /*if (!result || !result.hit)
            return this.collissionCheck(rayFunction, boundables, pickResult, fastCheck, predicate);
        if (!fastCheck && pickResult != null && result.distance >= pickResult.distance)
            return this.collissionCheck(rayFunction, boundables, pickResult, fastCheck, predicate);
        pickResult = result;
        if (fastCheck)
            return result;
        else
            return this.collissionCheck(rayFunction, boundables, pickResult);*/
    }//@ts-ignore
}

