export class TerraMesh extends BABYLON.Mesh {
    constructor(name: string, protected wasm) {
        super(name);
    }
}