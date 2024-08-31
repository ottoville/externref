/* eslint-disable @typescript-eslint/no-namespace */
const sliderTemplate = `<label>
        <span id="label">Y</span>:
        <input
          style="vertical-align: middle"
          title="rotation Y"
          type="range"
          min="-3.14"
          max="3.14"
          step="0.01"
        />
      </label>
      <span id="value"></span>`;

export class SliderElement extends HTMLElement {
  set valueAsNumber(newValue: number) {
    this.#setValue(newValue);
  }

  get valueAsNumber() {
    return this.#input.valueAsNumber;
  }
  #label: HTMLSpanElement;
  #value: HTMLSpanElement;
  #input: HTMLInputElement;

  #setValue(newValue: number) {
    this.#input.valueAsNumber = newValue;
    this.#setLabel();
  }
  #setLabel() {
    this.#value.textContent = (
      (180 / Math.PI) *
      this.#input.valueAsNumber
    ).toFixed(2);
  }
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = sliderTemplate;
    this.#input = shadowRoot.querySelector<HTMLInputElement>('input')!;
    this.#input.addEventListener('input', () => {
      if (
        shadowRoot.dispatchEvent(
          new CustomEvent('input', {
            bubbles: true,
            composed: true,
          }),
        )
      ) {
        this.#setLabel();
      }
    });
    this.#label = shadowRoot.getElementById('label')!;
    this.#value = shadowRoot.getElementById('value')!;
  }
  disconnectedCallback() {}
  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name == 'value') {
      this.#setValue(parseFloat(newValue));
    } else if (name == 'label') {
      this.#label.textContent = newValue;
    } else if (name == 'label-long') {
      this.#input.title = newValue;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'slider-label': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
customElements.define('slider-label', SliderElement);
