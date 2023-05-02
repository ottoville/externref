export function Vertex({vertex}: {vertex: Float32Array}) {
    return <>
        x: { vertex[0]!.toFixed(3) }, y: { vertex[1]!.toFixed(3) }, z: { vertex[2]!.toFixed(3) }
    </>
}