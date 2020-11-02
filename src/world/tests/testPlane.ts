import { TerraScene } from "../../TerraScene";



export class testPlane {

    constructor(private scene: TerraScene) {
        const testPlaneRenderpipeline = this.scene.gpuscene.lights.lightsBindGroup.addRenderPipeline({
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
        });
        testPlaneRenderpipeline.addDrawable(new Set([scene.gpuscene.renderPassScreen]),7)
        testPlaneRenderpipeline.properties = 1;
    }
}

export class testPlaneNormals {

    constructor(private scene: TerraScene) {
        const renderPipeline = this.scene.gpuscene.lights.lightsBindGroup.addRenderPipeline({
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
        });
        renderPipeline.addDrawable(new Set([scene.gpuscene.renderPassScreen]),14)
        renderPipeline.properties = 1;
    }
}