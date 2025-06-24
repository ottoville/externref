import { UIRectangle } from './UIRectangle.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export abstract class UIRectangleText extends UIRectangle {
  updateBoundingBoxAndVertices({
    vertices,
    content_sizeX,
    content_sizeY,
    textUV,
  }: {
    vertices: Float32Array;
    content_sizeX: number;
    content_sizeY: number;
    outer_sizeX: number;
    outer_sizeY: number;
    textUV: [
      topLeft: [number, number],
      topRight: [number, number],
      bottomRight: [number, number],
      bottomLeft: [number, number],
    ];
  }) {
    vertices.set([
      //bottom left
      -content_sizeX,
      -content_sizeY,
      ...textUV[3],
      //bottom right
      content_sizeX,
      -content_sizeY,
      ...textUV[2],
      //top left
      -content_sizeX,
      content_sizeY,
      ...textUV[0],

      //top left
      -content_sizeX,
      content_sizeY,
      ...textUV[0],
      //bottom right
      content_sizeX,
      -content_sizeY,
      ...textUV[2],
      //top right
      content_sizeX,
      content_sizeY,
      ...textUV[1],
    ]);
  }
}
