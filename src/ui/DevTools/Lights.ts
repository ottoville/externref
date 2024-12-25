import type { Engine } from '../../engine.js';
declare const engine: Engine;

/* eslint-disable @typescript-eslint/no-namespace */
const lightsTemplate = ` <fieldset>
      <legend>Lights</legend>
      Visible directional lights: <span id="directional"></span>
      Visible point lights: <span id="point"></span>
    </fieldset>`;

export class LightsElement extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = lightsTemplate;
    const directional =
      shadowRoot.querySelector<HTMLInputElement>('#directional')!;
    const point = shadowRoot.querySelector<HTMLInputElement>('#point')!;
    directional.textContent = engine.rust
      .get_directional_lights_count()
      .toString();
    point.textContent = engine.rust.get_point_lights_count().toString();
  }
  disconnectedCallback() {}
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lights-devtool': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
customElements.define('lights-devtool', LightsElement);
