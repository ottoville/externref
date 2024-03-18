import type { Engine } from '../engine.js';
import {
  UIRectangleNodeButton,
  UIRectangleNodeProps,
  buttonTexture,
  type UIRectangleNodeState,
} from './UIRectangleNode.js';
declare const engine: Engine;

const buttonTextureHover = await fetch('/assets/button_hover.webp')
  .then((asset) => asset.blob())
  .then(createImageBitmap);

const UIRectangleNodeHovers = new Set<UIRectangleNodeHover>();

document.addEventListener('keyup', (evt) => {
  if (engine.tabElement && engine.tabElement.instance) {
    let vec1: [number, number] = [0, 0];
    if (evt.key === 'ArrowDown') {
      vec1 = [0, -1];
    } else if (evt.key === 'ArrowUp') {
      vec1 = [0, 1];
    } else if (evt.key === 'ArrowLeft') {
      vec1 = [-1, 0];
    } else if (evt.key === 'ArrowRight') {
      vec1 = [1, 0];
    } else if (evt.key === 'Enter') {
      if (engine.tabElement.props.events?.onClick) {
        engine.tabElement.props.events?.onClick();
      }
      return;
    } else {
      return;
    }
    const currentCoord = engine.tabElement.instance.screenPosition;
    let smallestLength: [number, UIRectangleNodeHover] | undefined = undefined;
    UIRectangleNodeHovers.forEach((node) => {
      if (node === engine.tabElement || !node.instance) return;
      const vec2: [number, number] = [
        node.instance.screenPosition[0] - currentCoord[0],
        node.instance.screenPosition[1] - currentCoord[1],
      ];
      const len = Math.sqrt(vec2[0] * vec2[0] + vec2[1] * vec2[1]);
      vec2[0] = vec2[0] / len;
      vec2[1] = vec2[1] / len;
      const dot = vec1[0] * vec2[0] + vec1[1] * vec2[1];

      if (dot < 0.5) return;
      const weightedLen = len / dot;
      if (smallestLength) {
        if (weightedLen < smallestLength[0]) {
          smallestLength = [weightedLen, node];
        }
      } else {
        smallestLength = [weightedLen, node];
      }
    });
    if (smallestLength) engine.setTabIndex(smallestLength[1]);
  }
});

let currentTabIndex = 1;

/**
 * UI element that have active state when mouse hover.
 */
export class UIRectangleNodeHover<
  S extends UIRectangleNodeState = UIRectangleNodeState,
> extends UIRectangleNodeButton<S, UIRectangleNodeProps> {
  changeTabIndex = (element?: UIRectangleNodeHover) => {
    if (element !== this && this.state.bitmap === buttonTextureHover) {
      this.setState({
        ...this.state,
        bitmap: buttonTexture,
      });
    } else if (element === this && this.state.bitmap === buttonTexture) {
      this.setState({
        ...this.state,
        bitmap: buttonTextureHover,
      });
    }
  };
  tabIndex = currentTabIndex++;
  constructor(props: UIRectangleNodeProps) {
    props.events = {
      ...props.events,
      onPointerEnter: () => {
        engine.setTabIndex(this);
      },
      onPointerLeave: () => {
        engine.setTabIndex();
      },
    };
    super(props);
    UIRectangleNodeHovers.add(this);

    engine.getTabIndex(this.changeTabIndex);
  }
  override destroy() {
    engine.TabIndexSubscribions.delete(this.changeTabIndex);
    UIRectangleNodeHovers.delete(this);
    super.destroy();
  }
}
