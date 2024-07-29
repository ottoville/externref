import type { DevTools } from './ui/DevTools/DevTools.js';

const devToolsTemplate = `<link rel="stylesheet" href="/css/DevTools.css"/>
<aside>
      <button id="closebtn" type="button">Close </button>
    <div id="DevToolsAppContainer"></div>
</aside>`;

customElements.define(
  'dev-tools',
  class extends HTMLElement {
    #closeBtn: HTMLButtonElement;
    #root?: ReturnType<typeof DevTools>;
    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = devToolsTemplate;
      this.#closeBtn = shadowRoot.querySelector<HTMLButtonElement>('button')!;
    }
    async connectedCallback() {
      const { DevTools } = await import('./ui/DevTools/DevTools.js');
      this.#root = DevTools(
        this.shadowRoot!.querySelector<HTMLElement>('aside')!,
      );
      this.#closeBtn.addEventListener('click', () => {
        this.shadowRoot!.dispatchEvent(
          new CustomEvent('close', {
            bubbles: true,
            composed: true,
          }),
        );
      });
    }
    disconnectedCallback() {
      this.#root!.unmount();
    }
  },
);
