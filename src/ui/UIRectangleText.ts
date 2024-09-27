import { UIRectangle } from './UIRectangle.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export abstract class UIRectangleText extends UIRectangle {
  protected textUV: [
    topLeft: [number, number],
    topRight: [number, number],
    bottomRight: [number, number],
    bottomLeft: [number, number],
  ] = [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ];

  updateBoundingBoxAndVertices({
    vertices,
    content_sizeX,
    content_sizeY,
  }: {
    vertices: Float32Array;
    content_sizeX: number;
    content_sizeY: number;
    outer_sizeX: number;
    outer_sizeY: number;
  }) {
    vertices.set([
      //bottom left
      -content_sizeX,
      -content_sizeY,
      ...this.textUV[3],
      //bottom right
      content_sizeX,
      -content_sizeY,
      ...this.textUV[2],
      //top left
      -content_sizeX,
      content_sizeY,
      ...this.textUV[0],

      //top left
      -content_sizeX,
      content_sizeY,
      ...this.textUV[0],
      //bottom right
      content_sizeX,
      -content_sizeY,
      ...this.textUV[2],
      //top right
      content_sizeX,
      content_sizeY,
      ...this.textUV[1],
    ]);
  }
}
