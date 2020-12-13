import { Nullable, FloatArray } from "../types";
import { Vector3, Vector2, TmpVectors } from "../Maths/math.vector";
import { AbstractMesh } from "../Meshes/abstractMesh";
import { Sprite } from "../Sprites/sprite";

declare type Ray = import("../Culling/ray").Ray;

/**
     * Information about the result of picking within a scene
     * @see https://doc.babylonjs.com/babylon101/picking_collisions
     */
export class PickingInfo {
    /** @hidden */
    public _pickingUnavailable = false;

    /**
     * If the pick collided with an object
     */
    public hit = false;
    /**
     * Distance away where the pick collided
     */
    public distance = 0;
    /**
     * The location of pick collision
     */
    public pickedPoint: Nullable<Vector3> = null;
    /**
     * The mesh corresponding the the pick collision
     */
    public pickedMesh: Nullable<AbstractMesh> = null;
    /** (See getTextureCoordinates) The barycentric U coordinate that is used when calculating the texture coordinates of the collision.*/
    public bu = 0;
    /** (See getTextureCoordinates) The barycentric V coordinate that is used when calculating the texture coordinates of the collision.*/
    public bv = 0;
    /** The index of the face on the mesh that was picked, or the index of the Line if the picked Mesh is a LinesMesh */
    public faceId = -1;
    /** Id of the the submesh that was picked */
    public subMeshId = 0;
    /** If a sprite was picked, this will be the sprite the pick collided with */
    public pickedSprite: Nullable<Sprite> = null;
    /**
     * If a mesh was used to do the picking (eg. 6dof controller) this will be populated.
     */
    public originMesh: Nullable<AbstractMesh> = null;
    /**
     * The ray that was used to perform the picking.
     */
    public ray: Nullable<Ray> = null;

    /**
     * Gets the normal correspodning to the face the pick collided with
     * @param useWorldCoordinates If the resulting normal should be relative to the world (default: false)
     * @param useVerticesNormals If the vertices normals should be used to calculate the normal instead of the normal map
     * @returns The normal correspodning to the face the pick collided with
     */
    public getNormal(useWorldCoordinates = false, useVerticesNormals = true): Nullable<Vector3> {
        return null;
    }

    /**
     * Gets the texture coordinates of where the pick occured
     * @returns the vector containing the coordnates of the texture
     */
    public getTextureCoordinates(): Nullable<Vector2> {
        return null;
    }
}
