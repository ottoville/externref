import type { NodeIndexed } from "../../nodes/NodeIndexed.js"

export function Indices({ node } : {node: NodeIndexed}) {
    const verticesArray = node.verticesArray;
    return <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Index</th>
                <th colSpan={3}>Position</th>
            </tr>
        </thead>
        <tbody className="indices">
            {Array.from(node.indexed.indices).map((index, i) => {
                return <tr key={i}>
                    <td>{i}</td>
                    <td>{index}</td>
                    <td>{verticesArray[index]![0]!.toFixed(3)}</td>
                    <td>{verticesArray[index]![1]!.toFixed(3)}</td>
                    <td>{verticesArray[index]![2]!.toFixed(3)}</td>
                </tr>
            })}
        </tbody>
    </table>
}