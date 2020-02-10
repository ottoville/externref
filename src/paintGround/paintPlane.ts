import { paintGround } from "./paintGround.js";
import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
import * as BABYLON from "../lib/babylon/index.js"
import type { PTResultF } from "../types/interfaces/index.js";
export class paintPlane extends paintGround {

    private forceSharedVertices = true;
    private tempplane: BABYLON.Mesh | null = null;
    private startingPoint: Vector2 = Vector2.Zero();
    private planeorgpos: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    constructor(
        public canvas: HTMLElement,
        protected scene: BABYLON.Scene,
        protected camera: BABYLON.ArcRotateCamera,
        protected ground: Terrain,
        protected sea: BABYLON.Mesh,
        uitab: UITAB
    ) {
        super(canvas, scene, camera, ground, sea, uitab);
    };
    public activate(callback: PTResultF, options: { forceSharedVertices?: boolean }) {
        this.tempplane = BABYLON.MeshBuilder.CreateTiledGround("tgd2", { xmin: -0.5, xmax: 0.5, zmin: -0.5, zmax: 0.5, subdivisions: { w: 10, h: 10 }, precision: { w: 0, h: 0 }, updatable: true });
        super.activate(callback, options);
        if (typeof (options.forceSharedVertices) !== 'undefined')
            this.forceSharedVertices = options.forceSharedVertices;
    }
    public deactivate() {
        super.deactivate();
        if (this.tempplane)
            this.tempplane.dispose();
    }
    
    onMainPointerDown(startingPoint: Vector2) {
        this.startingPoint = startingPoint;
        if (!this.tempplane)
            throw(new Error('templane object has not been initalized'))
        this.tempplane.scaling.z = 10;
        this.tempplane.scaling.x = 10;
        this.tempplane.rotation.y = Math.PI / 2;

        this.tempplane.position.x = startingPoint.x - 0.5

        this.tempplane.position.z = startingPoint.y - 1

        this.tempplane.material = new BABYLON.StandardMaterial("planeMat2", this.scene);
        this.tempplane.material.wireframe = true;
        if (this.forceSharedVertices) {
            let uvdata: BABYLON.Nullable<BABYLON.FloatArray>;
            if (uvdata = this.tempplane.getVerticesData(BABYLON.VertexBuffer.UVKind)) {
                for (let uv = 0; uv < uvdata.length; uv++) {
                    uvdata[uv] = 0;
                }
                this.tempplane.updateVerticesData(BABYLON.VertexBuffer.UVKind, uvdata);
            }
        }
    }
    onMainPointerUp(end_position: Vector2, height: number): void {
        let meshCenter: Vector2 = end_position.subtract(this.startingPoint).divide(new Vector2(2, 2));
        let pos = this.startingPoint.add(meshCenter);
        if (!this.tempplane)
            throw (new Error('templane object has not been initalized'))

        this.tempplane.position = new BABYLON.Vector3(pos.x, 0.2, pos.y);
        this.tempplane.position.y = 0.2;
        this.tempplane.scaling.x = height;
        this.tempplane.rotation.y = this.ang360.rad;
        this.planeorgpos = this.tempplane.position.clone();

    }
    onAreaDraw(width: number): void {
        if (!this.tempplane)
            throw (new Error('templane object has not been initalized'))

        let brad = Math.PI / 2 - this.ang.rad;
        let halfw = width / 2;
        let addX = Math.cos(brad) * halfw
        let addZ = Math.sin(brad) * halfw;

        if (this.ang360.deg < 180)
            addX = addX * -1
        if (this.ang360.deg > 270 || this.ang360.deg < 90)
            addZ = addZ * -1
        if (this.forceSharedVertices)
            this.tempplane.forceSharedVertices();
        this.tempplane.scaling.z = width;
        this.tempplane.position.x = this.planeorgpos.x + addX;
        this.tempplane.position.z = this.planeorgpos.z + addZ;


        let positions = this.tempplane.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (positions == null) {
            throw ('getVerticesData returned null');
        }
        var numberOfVertices = positions.length / 3;
        var rotmax = rotateMatrix(this.ang360.rad, "y");
        for (var i = 0; i < numberOfVertices; i++) {
            let posX = (positions[i * 3]) * this.tempplane.scaling.x
            let posZ = (positions[i * 3 + 2]) * this.tempplane.scaling.z
            let translated = translate(posX, 0, posZ, rotmax);
            positions[i * 3 + 1] = this.ground.getHeightAtCoordinates(this.tempplane.position.x + translated.x, this.tempplane.position.z + translated.z)
        }
        this.tempplane.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);

    }
}