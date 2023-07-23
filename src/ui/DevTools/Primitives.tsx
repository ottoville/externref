import { DataNode } from '../../nodes/DataNode.js';
import { Vertex } from './Vertex.js';
import { useRef, useState } from 'react';
import { Indices } from './Indices.js';

export function Primitives({ node, }: { node: DataNode}) {
    const indices = useRef<HTMLDetailsElement>(null);
    const [
        indicesOpen,
        setIndicesOpen
    ] = useState(false);
    const vertices = useRef<HTMLDetailsElement>(null);
    const [
        verticesOpen,
        setVerticesOpen
    ] = useState(false);

    return <fieldset>
        <legend>Primitives</legend>
        <details ref={vertices} onToggle={() => {
            setVerticesOpen(vertices.current?.open ?? false);
        }}>
            <summary>Vertices</summary>
            {node instanceof DataNode && verticesOpen ?
                <ol>
                    {node.verticesArray.map((vertex, i) => {
                        return <li key={i}><Vertex vertex={vertex}></Vertex></li>;
                    })}
                </ol> : null }
        </details>
        {node.indices_count !== 0 ?
            <details ref={indices} onToggle={() => {
                setIndicesOpen(indices.current?.open ?? false);
            }}>
                <summary>Indices</summary>
                {indicesOpen ? <Indices node={node}></Indices> : null}
            </details>
            : null}
    </fieldset>;

}