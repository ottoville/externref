export function Vertex({ vertex }: { vertex: Float32Array }) {
  if (vertex.length < 8) {
    return (
      <tr>
        <td>{vertex[0]!.toFixed(3)}</td>
        <td>{vertex[1]!.toFixed(3)}</td>
        <td>{vertex[2]!.toFixed(3)}</td>
      </tr>
    );
  } else {
    return (
      <tr>
        <td>{vertex[0]!.toFixed(3)}</td>
        <td>{vertex[1]!.toFixed(3)}</td>
        <td>{vertex[2]!.toFixed(3)}</td>
        <td>{vertex[4]!.toFixed(3)}</td>
        <td>{vertex[5]!.toFixed(3)}</td>
        <td>{vertex[6]!.toFixed(3)}</td>
      </tr>
    );
  }
}
