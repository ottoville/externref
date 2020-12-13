import { Nullable } from "../types";
import { AbstractMesh } from "../Meshes/abstractMesh";
import { LinesMesh, InstancedLinesMesh } from "../Meshes/linesMesh";
import { Vector3, TmpVectors } from "../Maths/math.vector";
import { IDisposable } from "../scene";
import { Observer } from "../Misc/observable";
import { Material } from "../Materials/material";
import { ShaderMaterial } from "../Materials/shaderMaterial";
import { Camera } from "../Cameras/camera";
import { Constants } from "../Engines/constants";
import { Node } from "../node";

//import "../Shaders/line.fragment";
//import "../Shaders/line.vertex";
import { DataBuffer } from '../Meshes/dataBuffer';

declare module "../Meshes/abstractMesh" {
    export interface AbstractMesh {
        /**
         * Gets the edgesRenderer associated with the mesh
         */
        edgesRenderer: Nullable<EdgesRenderer>;
    }
}
AbstractMesh.prototype.disableEdgesRendering = function(): AbstractMesh {
    if (this._edgesRenderer) {
        this._edgesRenderer.dispose();
        this._edgesRenderer = null;
    }
    return this;
};

AbstractMesh.prototype.enableEdgesRendering = function(epsilon = 0.95, checkVerticesInsteadOfIndices = false): AbstractMesh {
    this.disableEdgesRendering();
    this._edgesRenderer = new EdgesRenderer(this, epsilon, checkVerticesInsteadOfIndices);
    return this;
};

Object.defineProperty(AbstractMesh.prototype, "edgesRenderer", {
    get: function(this: AbstractMesh) {
        return this._edgesRenderer;
    },
    enumerable: true,
    configurable: true
});

declare module "../Meshes/linesMesh" {
    export interface LinesMesh {
        /**
         * Enables the edge rendering mode on the mesh.
         * This mode makes the mesh edges visible
         * @param epsilon defines the maximal distance between two angles to detect a face
         * @param checkVerticesInsteadOfIndices indicates that we should check vertex list directly instead of faces
         * @returns the currentAbstractMesh
         * @see https://www.babylonjs-playground.com/#19O9TU#0
         */
        enableEdgesRendering(epsilon?: number, checkVerticesInsteadOfIndices?: boolean): AbstractMesh;
    }
}
LinesMesh.prototype.enableEdgesRendering = function(epsilon = 0.95, checkVerticesInsteadOfIndices = false): AbstractMesh {
    this.disableEdgesRendering();
    this._edgesRenderer = new LineEdgesRenderer(this, epsilon, checkVerticesInsteadOfIndices);
    return this;
};

declare module "../Meshes/linesMesh" {
    export interface InstancedLinesMesh {
        /**
         * Enables the edge rendering mode on the mesh.
         * This mode makes the mesh edges visible
         * @param epsilon defines the maximal distance between two angles to detect a face
         * @param checkVerticesInsteadOfIndices indicates that we should check vertex list directly instead of faces
         * @returns the current InstancedLinesMesh
         * @see https://www.babylonjs-playground.com/#19O9TU#0
         */
        enableEdgesRendering(epsilon?: number, checkVerticesInsteadOfIndices?: boolean): InstancedLinesMesh;
    }
}

/**
 * FaceAdjacencies Helper class to generate edges
 */
class FaceAdjacencies {
    public edges = new Array<number>();
    public p0: Vector3;
    public p1: Vector3;
    public p2: Vector3;
    public edgesConnectedCount = 0;
}

/**
 * Defines the minimum contract an Edges renderer should follow.
 */
export interface IEdgesRenderer extends IDisposable {
    /**
     * Gets or sets a boolean indicating if the edgesRenderer is active
     */
    isEnabled: boolean;

    /**
     * Renders the edges of the attached mesh,
     */
    render(): void;

    /**
     * Checks wether or not the edges renderer is ready to render.
     * @return true if ready, otherwise false.
     */
    isReady(): boolean;
}

/**
 * This class is used to generate edges of the mesh that could then easily be rendered in a scene.
 */
export class EdgesRenderer implements IEdgesRenderer {

    /**
     * Define the size of the edges with an orthographic camera
     */
    public edgesWidthScalerForOrthographic = 1000.0;

    /**
     * Define the size of the edges with a perspective camera
     */
    public edgesWidthScalerForPerspective = 50.0;

    protected _source: AbstractMesh;
    protected _linesPositions = new Array<number>();
    protected _linesNormals = new Array<number>();
    protected _linesIndices = new Array<number>();
    protected _epsilon: number;
    protected _indicesCount: number;

    protected _lineShader: ShaderMaterial;
    protected _ib: DataBuffer;
    protected _buffers: { [key: string]: Nullable<any> } = {};
    protected _checkVerticesInsteadOfIndices = false;

    private _meshRebuildObserver: Nullable<Observer<AbstractMesh>>;
    private _meshDisposeObserver: Nullable<Observer<Node>>;

    /** Gets or sets a boolean indicating if the edgesRenderer is active */
    public isEnabled = true;

    /**
     * Creates an instance of the EdgesRenderer. It is primarily use to display edges of a mesh.
     * Beware when you use this class with complex objects as the adjacencies computation can be really long
     * @param  source Mesh used to create edges
     * @param  epsilon sum of angles in adjacency to check for edge
     * @param  checkVerticesInsteadOfIndices bases the edges detection on vertices vs indices
     * @param  generateEdgesLines - should generate Lines or only prepare resources.
     */
    constructor(source: AbstractMesh, epsilon = 0.95, checkVerticesInsteadOfIndices = false, generateEdgesLines = true) {
        this._source = source;
        this._checkVerticesInsteadOfIndices = checkVerticesInsteadOfIndices;

        this._epsilon = epsilon;

        this._prepareRessources();
        if (generateEdgesLines) {
            this._generateEdgesLines();
        }

        this._meshRebuildObserver = this._source.onRebuildObservable.add(() => {
            this._rebuild();
        });

        this._meshDisposeObserver = this._source.onDisposeObservable.add(() => {
            this.dispose();
        });
    }

    protected _prepareRessources(): void {
        if (this._lineShader) {
            return;
        }

        this._lineShader = new ShaderMaterial("lineShader", this._source.getScene(), "line",
            {
                attributes: ["position", "normal"],
                uniforms: ["worldViewProjection", "color", "width", "aspectRatio"]
            });

        this._lineShader.disableDepthWrite = true;
        this._lineShader.backFaceCulling = false;
    }

    /** @hidden */
    public _rebuild(): void {
       
    }

    /**
     * Releases the required resources for the edges renderer
     */
    public dispose(): void {
       
    }

    protected _processEdgeForAdjacencies(pa: number, pb: number, p0: number, p1: number, p2: number): number {
        if (pa === p0 && pb === p1 || pa === p1 && pb === p0) {
            return 0;
        }

        if (pa === p1 && pb === p2 || pa === p2 && pb === p1) {
            return 1;
        }

        if (pa === p2 && pb === p0 || pa === p0 && pb === p2) {
            return 2;
        }

        return -1;
    }

    protected _processEdgeForAdjacenciesWithVertices(pa: Vector3, pb: Vector3, p0: Vector3, p1: Vector3, p2: Vector3): number {
        if (pa.equalsWithEpsilon(p0) && pb.equalsWithEpsilon(p1) || pa.equalsWithEpsilon(p1) && pb.equalsWithEpsilon(p0)) {
            return 0;
        }

        if (pa.equalsWithEpsilon(p1) && pb.equalsWithEpsilon(p2) || pa.equalsWithEpsilon(p2) && pb.equalsWithEpsilon(p1)) {
            return 1;
        }

        if (pa.equalsWithEpsilon(p2) && pb.equalsWithEpsilon(p0) || pa.equalsWithEpsilon(p0) && pb.equalsWithEpsilon(p2)) {
            return 2;
        }

        return -1;
    }

    /**
     * Checks if the pair of p0 and p1 is en edge
     * @param faceIndex
     * @param edge
     * @param faceNormals
     * @param  p0
     * @param  p1
     * @private
     */
    protected _checkEdge(faceIndex: number, edge: number, faceNormals: Array<Vector3>, p0: Vector3, p1: Vector3): void {
        var needToCreateLine;

        if (edge === undefined) {
            needToCreateLine = true;
        } else {
            var dotProduct = Vector3.Dot(faceNormals[faceIndex], faceNormals[edge]);

            needToCreateLine = dotProduct < this._epsilon;
        }

        if (needToCreateLine) {
            this.createLine(p0, p1, this._linesPositions.length / 3);
        }
    }

    /**
     * push line into the position, normal and index buffer
     * @protected
     */
    protected createLine(p0: Vector3, p1: Vector3, offset: number) {
        // Positions
        this._linesPositions.push(
            p0.x, p0.y, p0.z,
            p0.x, p0.y, p0.z,
            p1.x, p1.y, p1.z,
            p1.x, p1.y, p1.z
        );

        // Normals
        this._linesNormals.push(
            p1.x, p1.y, p1.z, -1,
            p1.x, p1.y, p1.z, 1,
            p0.x, p0.y, p0.z, -1,
            p0.x, p0.y, p0.z, 1
        );

        // Indices
        this._linesIndices.push(
            offset, offset + 1, offset + 2,
            offset, offset + 2, offset + 3
        );
    }

    /**
     * Generates lines edges from adjacencjes
     * @private
     */
    _generateEdgesLines(): void {
        
    }

    /**
     * Checks wether or not the edges renderer is ready to render.
     * @return true if ready, otherwise false.
     */
    public isReady(): boolean {
        return this._lineShader.isReady();
    }

    /**
     * Renders the edges of the attached mesh,
     */
    public render(): void {
        var scene = this._source.getScene();

        if (!this.isReady() || !scene.activeCamera) {
            return;
        }

        var engine = scene.getEngine();
        this._lineShader._preBind();

        if (this._source.edgesColor.a !== 1) {
            engine.setAlphaMode(Constants.ALPHA_COMBINE);
        } else {
            engine.setAlphaMode(Constants.ALPHA_DISABLE);
        }

        // VBOs
        engine.bindBuffers(this._buffers, this._ib, <any>this._lineShader.getEffect());

        scene.resetCachedMaterial();
        this._lineShader.setColor4("color", this._source.edgesColor);

        if (scene.activeCamera.mode === Camera.ORTHOGRAPHIC_CAMERA) {
            this._lineShader.setFloat("width", this._source.edgesWidth / this.edgesWidthScalerForOrthographic);
        } else {
            this._lineShader.setFloat("width", this._source.edgesWidth / this.edgesWidthScalerForPerspective);
        }

        this._lineShader.setFloat("aspectRatio", engine.getAspectRatio(scene.activeCamera));
        this._lineShader.bind(this._source.getWorldMatrix());

        // Draw order
        engine.drawElementsType(Material.TriangleFillMode, 0, this._indicesCount);
        this._lineShader.unbind();
    }
}

/**
 * LineEdgesRenderer for LineMeshes to remove unnecessary triangulation
 */
export class LineEdgesRenderer extends EdgesRenderer {

    /**
     * This constructor turns off auto generating edges line in Edges Renderer to make it here.
     * @param  source LineMesh used to generate edges
     * @param  epsilon not important (specified angle for edge detection)
     * @param  checkVerticesInsteadOfIndices not important for LineMesh
     */
    constructor(source: AbstractMesh, epsilon = 0.95, checkVerticesInsteadOfIndices = false) {
        super(source, epsilon, checkVerticesInsteadOfIndices, false);
        this._generateEdgesLines();
    }

    /**
     * Generate edges for each line in LinesMesh. Every Line should be rendered as edge.
     */
    _generateEdgesLines(): void {
       
    }
}
