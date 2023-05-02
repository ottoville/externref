import { NodeIndexed } from "../../nodes/NodeIndexed.js"
import type { DataNode } from "../../nodes/DataNode.js"
import { Vertex } from "./Vertex.js"
import { useRef, useState } from "react"
import { Indices } from "./Indices.js";

export function Primitives({ node }: { node: DataNode }) {
    let indices = useRef<HTMLDetailsElement>(null);
    let [indicesOpen, setIndicesOpen] = useState(false);
    let vertices = useRef<HTMLDetailsElement>(null);
    let [verticesOpen, setVerticesOpen] = useState(false);

    return <fieldset>
        <legend>Primitives</legend>
        <details ref={vertices} onToggle={() => {
            setVerticesOpen(vertices.current?.open ?? false)
        }}>
            <summary>Vertices</summary>
            {verticesOpen ? 
            <ol>
                {node.verticesArray.map((vertex, i) => {
                    return <li key={i}><Vertex vertex={vertex}></Vertex></li>
                })}
            </ol> : null }
        </details>
        {node instanceof NodeIndexed ?
            <details ref={indices} onToggle={() => {
                setIndicesOpen(indices.current?.open ?? false);
            }}>
                <summary>Indices</summary>
                {indicesOpen ? <Indices node={node}></Indices> : null}
            </details>
            : null}
    </fieldset>

}