/* eslint-disable @typescript-eslint/no-namespace */
const sliderTemplate = `<label>
        <span id="label"></span>:
        <input
          style="vertical-align: middle"
          title="rotation Y"
          type="range"
          step="0.01"
        />
      </label>
      <span id="text"></span>`;

export class SliderElement extends HTMLElement {
  static observedAttributes = ['label', 'min', 'max', 'value'] as const;

  set valueAsNumber(newValue: number) {
    this.setAttribute('value', newValue.toString());
  }

  get valueAsNumber() {
    return this.#input.valueAsNumber;
  }
  #label: HTMLSpanElement;
  #input: HTMLInputElement;
  #text: HTMLSpanElement;

  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = sliderTemplate;
    this.#input = shadowRoot.querySelector<HTMLInputElement>('input')!;
    this.#input.addEventListener('input', (evt) => {
      this.#text.textContent = this.textCallback
        ? this.textCallback(this.#input.valueAsNumber)
        : this.#input.value;
      evt.stopPropagation();
      shadowRoot.dispatchEvent(
        new CustomEvent('input', {
          bubbles: true,
          composed: true,
          detail: {
            value: (evt.target as HTMLInputElement).valueAsNumber,
          },
        }),
      );
    });
    this.#label = shadowRoot.getElementById('label')!;
    this.#text = shadowRoot.getElementById('text')!;
  }
  textCallback?: (text: number) => string;
  disconnectedCallback() {}
  attributeChangedCallback(
    name: (typeof SliderElement)['observedAttributes'][number],
    oldValue: string | null,
    newValue: string,
  ) {
    if (name == 'value') {
      this.#input.valueAsNumber = parseFloat(newValue);
      if (newValue !== oldValue || oldValue === null) {
        this.#text.textContent = this.textCallback
          ? this.textCallback(this.#input.valueAsNumber)
          : newValue;
      }
    } else if (name == 'label') {
      this.#label.textContent = newValue;
    } else if (name == 'min') {
      this.#input.min = newValue;
    } else if (name == 'max') {
      this.#input.max = newValue;
    }
  }
}
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'slider-label': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> &
          Partial<
            Record<(typeof SliderElement)['observedAttributes'][number], string>
          >,
        HTMLElement
      >;
    }
  }
}
customElements.define('slider-label', SliderElement);
