import { DrawableDirect } from '../../GPU/Drawables/DrawableDirect.js';
import type { Drawable } from '../../GPU/Drawables/Drawable.js';
import { memo, useEffect, useState } from 'react';
import { createWireFrameMesh } from '../../GPU/Meshes/helpers/wireframe.js';
import { DataNode } from '../../nodes/DataNode.js';
import { NormalsMesh } from '../../GPU/Meshes/helpers/normals.js';
import { BoundingBoxMesh } from '../../GPU/Meshes/helpers/boundingbox.js';
import { DrawableIndexed } from '../../GPU/Drawables/DrawableIndexed.js';
import type { MainNode } from '../../MainNode.js';
import { Rotation } from './Rotation.jsx';
import { Primitives } from './Primitives.jsx';
import { creatDepthSlices } from '../../GPU/Meshes/helpers/depthSlices.js';
import type { Engine } from '../../engine.js';
import type { IndexedDataNode } from '../../nodes/IndexedDataNode.js';
import './Light.ts';
declare const engine: Engine;

export const NodeInfo = memo(function NodeInfo({
  drawable,
}: {
  drawable: Drawable;
}) {
  const [translation, setTranslation] = useState(new Float32Array(3));
  const [scale, setScale] = useState(new Float32Array(3));
  useEffect(() => {
    const ptr = engine.rust.devtools_pointer();
    const CB_ID = engine.rust.add_onchange_callback(drawable.node.id);
    const listener = () => {
      setTranslation(new Float32Array(engine.rust.memory.buffer, ptr + 12, 3));
      setScale(new Float32Array(engine.rust.memory.buffer, ptr + 24, 3));
    };
    drawable.node.onMeshChange.add(listener);
    listener();
    return () => {
      drawable.node.onMeshChange.delete(listener);
      engine.rust.remove_onchange_callback(drawable.node.id, CB_ID);
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
              const currentTranslation = drawable.node.getTranslationFromId();

              drawable.node.setTranslation([
                evt.target.valueAsNumber,
                currentTranslation[1],
                currentTranslation[2],
              ]);
            }}
            title="translation X"
            type="number"
            step="1"
            value={translation[0]!.toFixed(3)}
          />
        </label>
        <br />
        <label>
          Y:
          <input
            onChange={(evt) => {
              const currentTranslation = drawable.node.getTranslationFromId();

              drawable.node.setTranslation([
                currentTranslation[0],
                evt.target.valueAsNumber,
                currentTranslation[2],
              ]);
            }}
            title="translation Y"
            type="number"
            step="1"
            value={translation[1]!.toFixed(3)}
          />
        </label>
        <br />
        <label>
          Z:
          <input
            onChange={(evt) => {
              const currentTranslation = drawable.node.getTranslationFromId();

              drawable.node.setTranslation([
                currentTranslation[0],
                currentTranslation[1],
                evt.target.valueAsNumber,
              ]);
            }}
            title="translation Z"
            type="number"
            step="1"
            value={translation[2]!.toFixed(3)}
          />
        </label>
      </fieldset>
      <Rotation node={drawable.node} />
      <light-details mesh-id={drawable.node.id.toString()}></light-details>
      <fieldset>
        <legend>Scale</legend>
        <label>
          X:
          <input
            onChange={(evt) => {
              drawable.node.update_scale(
                evt.target.valueAsNumber,
                scale[1]!,
                scale[2]!,
              );
            }}
            title="scale X"
            type="number"
            step="0.1"
            value={scale[0]!.toFixed(3)}
          />
        </label>
        <br />
        <label>
          Y:
          <input
            onChange={(evt) => {
              drawable.node.update_scale(
                scale[0]!,
                evt.target.valueAsNumber,
                scale[2]!,
              );
            }}
            title="scale Y"
            type="number"
            step="0.1"
            value={scale[1]!.toFixed(3)}
          />
        </label>
        <br />
        <label>
          Z:
          <input
            onChange={(evt) => {
              drawable.node.update_scale(
                scale[0]!,
                scale[1]!,
                evt.target.valueAsNumber,
              );
            }}
            title="scale Z"
            type="number"
            step="0.1"
            value={scale[2]!.toFixed(3)}
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
              <button
                type="button"
                onClick={() => {
                  engine.getGPU((gpu) => {
                    creatDepthSlices(gpu, drawable);
                  }, true);
                }}
              >
                Depth Slices
              </button>
              {drawable instanceof DrawableIndexed ? (
                <>
                  <br />
                  Indices count:
                  {drawable.indices_count ??
                    (drawable.node as IndexedDataNode).indices_count}
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
});
