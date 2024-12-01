import type { Destroyable } from './webgpu-ts/index.js';

export class Externref<
  O extends boolean = boolean,
  E extends Destroyable = Destroyable,
> {
  constructor(
    public ownedByJS: O,
    public externref: E,
  ) {}
}
