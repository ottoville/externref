import type { Engine } from '../../engine.js';
import { SliderElement } from './Slider.js';
declare const engine: Engine;

/* eslint-disable @typescript-eslint/no-namespace */
const lightsTemplate = ` <fieldset>
      <legend>Lights</legend>
      <slider-label label="Directional" min="0" max="1" id="directional"></slider-label><br>
      <slider-label label="Point" min="0" max="1" id="point"></slider-label>
    </fieldset>`;

export class LightElement extends HTMLElement {
  static observedAttributes = ['mesh-id'] as const;
  directional: SliderElement;
  point: SliderElement;

  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = lightsTemplate;
    this.directional = shadowRoot.querySelector<SliderElement>('#directional')!;
    this.point = shadowRoot.querySelector<SliderElement>('#point')!;
  }
  disconnectedCallback() {}
  attributeChangedCallback(
    name: (typeof LightElement)['observedAttributes'][number],
    _oldValue: string,
    newValue: string,
  ) {
    if (name === 'mesh-id') {
      this.directional.valueAsNumber = engine.rust.get_mesh_directional_light(
        parseInt(newValue),
      );
      this.point.valueAsNumber = engine.rust.get_mesh_point_light(
        parseInt(newValue),
      );
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'light-details': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> &
          Partial<
            Record<(typeof LightElement)['observedAttributes'][number], string>
          >,
        HTMLElement
      >;
    }
  }
}
customElements.define('light-details', LightElement);
