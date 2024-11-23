import { DataNode } from '../../nodes/DataNode.js';
import { Vertex } from './Vertex.jsx';
import { useEffect, useRef, useState } from 'react';
import { Indices } from './Indices.jsx';
import type { Engine } from '../../engine.js';
import { IndexedDataNode } from '../../nodes/IndexedDataNode.js';
declare const engine: Engine;

export function Primitives({ node }: { node: DataNode }) {
  const indices = useRef<HTMLDetailsElement>(null);
  const [indicesOpen, setIndicesOpen] = useState(false);
  const vertices = useRef<HTMLDetailsElement>(null);
  const [verticesOpen, setVerticesOpen] = useState(false);
  /**
   * Force re-render when there are change in vertices.
   */
  const [_, forceRender] = useState({});
  useEffect(() => {
    const listener = () => {
      forceRender({});
    };
    node.onVerticesChangeListeners.add(listener);
    return () => {
      node.onVerticesChangeListeners.delete(listener);
    };
  }, [node, engine.rust.memory.buffer]);

  return (
    <fieldset>
      <legend>Primitives</legend>
      <details
        ref={vertices}
        onToggle={() => {
          setVerticesOpen(vertices.current?.open ?? false);
        }}
      >
        <summary>Vertices</summary>
        <button
          type="button"
          onClick={() => {
            node.calculate_normals();
          }}
        >
          Calculate normals
        </button>
        <button
          type="button"
          onClick={() => {
            node.dedup_positions();
          }}
        >
          Dedup positions
        </button>

        {node instanceof DataNode && verticesOpen ? (
          <table id="vertices">
            <colgroup>
              <col span={3} className="positions" />
              <col span={3} className="normals" />
              <col span={2} className="uvs" />
            </colgroup>
            <thead>
              <tr>
                <th>x</th>
                <th>y</th>
                <th>z</th>
                <th>x2</th>
                <th>y2</th>
                <th>z2</th>
              </tr>
            </thead>
            <tbody>
              {node.verticesArray.map((vertex, i) => {
                return <Vertex vertex={vertex} key={i}></Vertex>;
              })}
            </tbody>
          </table>
        ) : null}
      </details>
      {node instanceof IndexedDataNode && node.indices_count !== 0 ? (
        <details
          ref={indices}
          onToggle={() => {
            setIndicesOpen(indices.current?.open ?? false);
          }}
        >
          <summary>Indices</summary>
          {indicesOpen ? <Indices node={node}></Indices> : null}
        </details>
      ) : null}
    </fieldset>
  );
}
