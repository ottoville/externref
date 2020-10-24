import { TerraScene } from "../../TerraScene";



export class testPlane {
    mesh = this.scene.gpuscene.lights.lightsBindGroup.addDrawable({
        sampleCount: this.scene.gpuscene.sampleCount,
        rasterizationState: {
            cullMode: 'none',
        },
        primitiveTopology: 'triangle-strip',
        colorStates: [{
            format: "bgra8unorm",
        }],
        vertexStage: {
            module: this.scene.gpuscene.shaderModules.get("testPlane.vert")!,
            entryPoint: "main",
        },
        fragmentStage: {
            module: this.scene.gpuscene.shaderModules.get("testPlane.frag")!,
            entryPoint: "main"
        },
        vertexState: {
            indexFormat: 'uint16' //todo: this is not needed as shader does not use indexes.
        }
    }, 7);
    
    constructor(private scene: TerraScene) {
        this.mesh.properties = 1;
    }
}

export class testPlaneNormals {
    mesh = this.scene.gpuscene.lights.lightsBindGroup.addDrawable({
        sampleCount: this.scene.gpuscene.sampleCount,
        rasterizationState: {
            cullMode: 'none',
        },
        primitiveTopology: 'line-list',
        colorStates: [{
            format: "bgra8unorm",
        }],
        vertexStage: {
            module: this.scene.gpuscene.shaderModules.get("testPlaneNormals.vert")!,
            entryPoint: "main",
        },
        fragmentStage: {
            module: this.scene.gpuscene.shaderModules.get("testPlaneNormals.frag")!,
            entryPoint: "main"
        }
    }, 14);
    constructor(private scene: TerraScene) {
    }
}