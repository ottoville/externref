import { useState } from 'react';
import { DataNode } from '../../nodes/DataNode.js';
import type { IndexedDataNode } from '../../nodes/IndexedDataNode.js';

export function Indices({ node }: { node: IndexedDataNode }) {
  const [start, setStart] = useState(0);
  const verticesArray = node.verticesArray;
  return (
    <>
      <button
        type="button"
        title="previous page"
        disabled={start === 0}
        onClick={() => {
          setStart(Math.max(start - 100, 0));
        }}
      >
        ⇦
      </button>
      <button
        type="button"
        title="next page"
        disabled={node.indices.length < start + 100}
        onClick={() => {
          setStart(start + 100);
        }}
      >
        ⇨
      </button>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Index</th>
            <th colSpan={3}>Position</th>
          </tr>
        </thead>
        <tbody className="indices">
          {Array.from(node.indices.subarray(start, start + 100)).map(
            (index, i) => {
              return (
                <tr key={start + i}>
                  <td>{start + i}</td>
                  <td>{index}</td>
                  {node instanceof DataNode ? (
                    verticesArray[index] === undefined ? (
                      <td>Error bad indice ${index}</td>
                    ) : (
                      <>
                        <td>{verticesArray[index]![0]!.toFixed(3)}</td>
                        <td>{verticesArray[index]![1]!.toFixed(3)}</td>
                        <td>{verticesArray[index]![2]!.toFixed(3)}</td>
                      </>
                    )
                  ) : null}
                </tr>
              );
            },
          )}
        </tbody>
      </table>
    </>
  );
}
