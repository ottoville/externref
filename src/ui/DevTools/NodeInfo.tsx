import { DrawableDirect } from '../../GPU/Drawables/DrawableDirect.js';
import type { Drawable } from '../../GPU/Drawables/Drawable.js';
import { ReadOnlyTerraVector3 } from '../../Math.js';
import { useEffect, useState } from 'react';
import { createWireFrameMesh } from '../../GPU/Meshes/helpers/wireframe.js';
import { DataNode } from '../../nodes/DataNode.js';
import { NormalsMesh } from '../../GPU/Meshes/helpers/normals.js';
import { BoundingBoxMesh } from '../../GPU/Meshes/helpers/boundingbox.js';
import { DrawableIndexed } from '../../GPU/Drawables/DrawableIndexed.js';
import type { MainNode } from '../../MainNode.js';
import { Rotation } from './Rotation.js';
import { Primitives } from './Primitives.js';

export function NodeInfo({ drawable }: { drawable: Drawable }) {
  const [translation, setTranslation] = useState(new ReadOnlyTerraVector3());
  const [scale, setScale] = useState(new ReadOnlyTerraVector3());
  useEffect(() => {
    setTranslation(drawable.node.translation);
    const listener = () => {
      setTranslation(new ReadOnlyTerraVector3(drawable.node.translation));
      setScale(new ReadOnlyTerraVector3(drawable.node.scale));
    };
    drawable.node.onMeshChange.add(listener);
    listener();
    return () => {
      drawable.node.onMeshChange.delete(listener);
    };
  }, [drawable]);
  return (
    <fieldset>
      <legend>{drawable.node.label}</legend>
      {drawable.renderPipeline.label}
      <br />
      <fieldset>
        <legend>Translation</legend>
        <label>
          X:
          <input
            onChange={(evt) => {
              drawable.node.translation = [
                evt.target.valueAsNumber,
                drawable.node.translation[1],
                drawable.node.translation[2],
              ];
            }}
            title="translation X"
            type="number"
            step="1"
            value={translation[0].toFixed(3)}
          />
        </label>
        <br />
        <label>
          Y:
          <input
            onChange={(evt) => {
              drawable.node.translation = [
                drawable.node.translation[0],
                evt.target.valueAsNumber,
                drawable.node.translation[2],
              ];
            }}
            title="translation Y"
            type="number"
            step="1"
            value={translation[1].toFixed(3)}
          />
        </label>
        <br />
        <label>
          Z:
          <input
            onChange={(evt) => {
              drawable.node.translation = [
                drawable.node.translation[0],
                drawable.node.translation[1],
                evt.target.valueAsNumber,
              ];
            }}
            title="translation Z"
            type="number"
            step="1"
            value={translation[2].toFixed(3)}
          />
        </label>
      </fieldset>
      <Rotation node={drawable.node} />
      <fieldset>
        <legend>Scale</legend>
        <label>
          X:
          <input
            onChange={(evt) => {
              drawable.node.update_scale(
                evt.target.valueAsNumber,
                scale[1],
                scale[2],
              );
            }}
            title="scale X"
            type="number"
            step="0.1"
            value={scale[0].toFixed(3)}
          />
        </label>
        <br />
        <label>
          Y:
          <input
            onChange={(evt) => {
              drawable.node.update_scale(
                scale[0],
                evt.target.valueAsNumber,
                scale[2],
              );
            }}
            title="scale Y"
            type="number"
            step="0.1"
            value={scale[1].toFixed(3)}
          />
        </label>
        <br />
        <label>
          Z:
          <input
            onChange={(evt) => {
              drawable.node.update_scale(
                scale[0],
                scale[1],
                evt.target.valueAsNumber,
              );
            }}
            title="scale Z"
            type="number"
            step="0.1"
            value={scale[2].toFixed(3)}
          />
        </label>
      </fieldset>
      {drawable.node instanceof DataNode ? (
        <Primitives node={drawable.node}></Primitives>
      ) : null}
      <br />
      {drawable instanceof DrawableDirect ? (
        <>
          Rigid body:{' '}
          {(drawable.node as MainNode).have_rigid_body ? 'true' : 'false'}
          <br />
          {drawable.node instanceof DataNode ? (
            <>
              Vertices count: {drawable.node.vertices_count}
              <br />
              <button
                type="button"
                onClick={() => {
                  new NormalsMesh(drawable);
                }}
              >
                Normals
              </button>
              <button
                type="button"
                onClick={() => {
                  createWireFrameMesh(drawable);
                }}
              >
                Wireframe
              </button>
              {drawable instanceof DrawableIndexed ? (
                <>
                  <br />
                  Indices count:
                  {drawable.indices_count ?? drawable.node.indices_count}
                  <br />
                  <button
                    type="button"
                    onClick={() => {
                      new BoundingBoxMesh(drawable);
                    }}
                  >
                    Bounding Box
                  </button>
                </>
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        ''
      )}
    </fieldset>
  );
}
