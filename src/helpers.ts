export function* createTiledGround(width: number): Generator<{ positions: number[], indices: number[] }, { positions: number[], indices: number[] }> {
    const positions: number[] = [0, 0, 0, 1];
    const indices: number[] = [0, 1];
    let row = 0;
    let backwards = false;
    while (true) {
        if (row != 0) {
            indices.push((positions.push(backwards?width:0, row + 1) - 2) * 0.5);
        }
        for (let i = 1; i <= width; i++) {
            if (!backwards && row === 0) {
                indices.push((positions.push(i, row) - 2) * 0.5)
            } else {
                indices.push(indices[indices.length - i * 4]!);
            }
            indices.push((positions.push(backwards?width - i:i, row + 1) - 2) * 0.5);
        }
        row++;
        backwards = !backwards
        yield { positions: positions, indices: indices };
    }
}