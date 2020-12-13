import { Nullable } from "../types";
import { Color4 } from "../Maths/math.color";
import { Mesh } from "../Meshes/mesh";
import { SmartArray } from "../Misc/smartArray";
import { Scene } from "../scene";
import { Texture } from "../Materials/Textures/texture";
import { Material } from "../Materials/material";
import { MaterialHelper } from "../Materials/materialHelper";
import { Camera } from "../Cameras/camera";
import { Constants } from "../Engines/constants";

//import "../Shaders/depth.fragment";
//import "../Shaders/depth.vertex";
import { _DevTools } from '../Misc/devTools';

/**
 * This represents a depth renderer in Babylon.
 * A depth renderer will render to it's depth map every frame which can be displayed or used in post processing
 */
export class DepthRenderer {
    private _scene: Scene;
    private _depthMap: any;
    private _effect: any;
    private readonly _storeNonLinearDepth: boolean;
    private readonly _clearColor: Color4;

    /** Get if the depth renderer is using packed depth or not */
    public readonly isPacked: boolean;

    private _cachedDefines: string;
    private _camera: Nullable<Camera>;

    /**
     * Specifiess that the depth renderer will only be used within
     * the camera it is created for.
     * This can help forcing its rendering during the camera processing.
     */
    public useOnlyInActiveCamera: boolean = false;

    /** @hidden */
    public static _SceneComponentInitialization: (scene: Scene) => void = (_) => {
        throw _DevTools.WarnImport("DepthRendererSceneComponent");
    }

    /**
     * Instantiates a depth renderer
     * @param scene The scene the renderer belongs to
     * @param type The texture type of the depth map (default: Engine.TEXTURETYPE_FLOAT)
     * @param camera The camera to be used to render the depth map (default: scene's active camera)
     * @param storeNonLinearDepth Defines whether the depth is stored linearly like in Babylon Shadows or directly like glFragCoord.z
     */
    constructor(scene: Scene, type: number = Constants.TEXTURETYPE_FLOAT, camera: Nullable<Camera> = null, storeNonLinearDepth = false) {
        this._scene = scene;
        this._storeNonLinearDepth = storeNonLinearDepth;
        this.isPacked = type === Constants.TEXTURETYPE_UNSIGNED_BYTE;
        if (this.isPacked) {
            this._clearColor = new Color4(1.0, 1.0, 1.0, 1.0);
        }
        else {
            this._clearColor = new Color4(1.0, 0.0, 0.0, 1.0);
        }

        DepthRenderer._SceneComponentInitialization(this._scene);

        this._camera = camera;
        var engine = scene.getEngine();


        // Custom render function
        var renderSubMesh = (subMesh: any): void => {
            var mesh = subMesh.getRenderingMesh();
            var scene = this._scene;
            var engine = scene.getEngine();
            let material = subMesh.getMaterial();

            mesh._internalAbstractMeshDataInfo._isActiveIntermediate = false;

            if (!material) {
                return;
            }

            // Culling and reverse (right handed system)
            engine.setState(material.backFaceCulling, 0, false, scene.useRightHandedSystem);

            // Managing instances
            var batch = mesh._getInstancesRenderList(subMesh._id);

            if (batch.mustReturn) {
                return;
            }

            var hardwareInstancedRendering = (engine.getCaps().instancedArrays) && (batch.visibleInstances[subMesh._id] !== null);

            var camera = this._camera || scene.activeCamera;
            if (this.isReady(subMesh, hardwareInstancedRendering) && camera) {
                engine.enableEffect(this._effect);
                mesh._bind(subMesh, this._effect, Material.TriangleFillMode);

                this._effect.setMatrix("viewProjection", scene.getTransformMatrix());

                this._effect.setFloat2("depthValues", camera.minZ, camera.minZ + camera.maxZ);

                // Alpha test
                if (material && material.needAlphaTesting()) {
                    var alphaTexture = material.getAlphaTestTexture();

                    if (alphaTexture) {
                        this._effect.setTexture("diffuseSampler", alphaTexture);
                        this._effect.setMatrix("diffuseMatrix", alphaTexture.getTextureMatrix());
                    }
                }

                // Bones
                if (mesh.useBones && mesh.computeBonesUsingShaders && mesh.skeleton) {
                    this._effect.setMatrices("mBones", mesh.skeleton.getTransformMatrices(mesh));
                }

                // Morph targets
                MaterialHelper.BindMorphTargetParameters(mesh, this._effect);

                // Draw
                mesh._processRendering(subMesh, this._effect, Material.TriangleFillMode, batch, hardwareInstancedRendering,
                    (isInstance, world) => this._effect.setMatrix("world", world));
            }
        };

        this._depthMap.customRenderFunction = (opaqueSubMeshes: SmartArray<any>, alphaTestSubMeshes: SmartArray<any>, transparentSubMeshes: SmartArray<any>, depthOnlySubMeshes: SmartArray<any>): void => {
            var index;

            if (depthOnlySubMeshes.length) {
                engine.setColorWrite(false);
                for (index = 0; index < depthOnlySubMeshes.length; index++) {
                    renderSubMesh(depthOnlySubMeshes.data[index]);
                }
                engine.setColorWrite(true);
            }

            for (index = 0; index < opaqueSubMeshes.length; index++) {
                renderSubMesh(opaqueSubMeshes.data[index]);
            }

            for (index = 0; index < alphaTestSubMeshes.length; index++) {
                renderSubMesh(alphaTestSubMeshes.data[index]);
            }
        };
    }

    /**
     * Creates the depth rendering effect and checks if the effect is ready.
     * @param subMesh The submesh to be used to render the depth map of
     * @param useInstances If multiple world instances should be used
     * @returns if the depth renderer is ready to render the depth map
     */
    public isReady(subMesh: any, useInstances: boolean): boolean {
        return this._effect.isReady();
    }

    /**
     * Gets the texture which the depth map will be written to.
     * @returns The depth map texture
     */
    public getDepthMap(): any {
        return this._depthMap;
    }

    /**
     * Disposes of the depth renderer.
     */
    public dispose(): void {
        this._depthMap.dispose();
    }
}
