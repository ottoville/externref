import type { BoundableNode } from "./TerraNode";

export abstract class Scene {
    boundables: Set<BoundableNode> = new Set();

 }

