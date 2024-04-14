const template = `<link rel="stylesheet" href="/css/template.css" />
<div id="loadingContainer">Loading...</div>
<div id="mainContainer">
  <dialog></dialog>
  <canvas tabindex="1"></canvas>
  <div id="progressBarContainer">
    <span></span>
    <br />
    <progress></progress>
  </div>
</div>
<div id="logincontainer">
  <h3>Log in to play the game</h3>
  <fieldset id="loginmethods1">
    <a href="/.auth/login/login">Login</a>
    <button class="playbtn">
      Continue without logging in and online features
    </button>
  </fieldset>
  <fieldset id="loginmethods2">
    <a href="/.auth/logout">Logout</a>
    <button class="playbtn">Play</button>
  </fieldset>
</div>`;

customElements.define(
  'game-container',
  class extends HTMLElement {
    private _internals!: ElementInternals;
    static observedAttributes = ['devtools'];
    #logincontainer: HTMLElement;
    #devSheet?: CSSStyleSheet;
    #devTools: HTMLElement | null = null;
    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = template;
      this.#logincontainer = shadowRoot.getElementById('logincontainer')!;
    }
    async connectedCallback() {
      if (!this.shadowRoot) {
        throw new Error('no shadowRoot');
      }
      const { ApplicationInsights } = await import('./bundled.js');
      const appInsights = new ApplicationInsights({
        config: {
          // TODO: Do not hardcode
          connectionString:
            'InstrumentationKey=7885914d-5b38-40fe-84e0-ac98b921b775;IngestionEndpoint=https://northeurope-0.in.applicationinsights.azure.com/;LiveEndpoint=https://northeurope.livediagnostics.monitor.azure.com/',
        },
      });
      appInsights.loadAppInsights();

      this._internals = this.attachInternals();
      const playBtn = this.shadowRoot.querySelectorAll('.playbtn');
      const creditentials = await fetch('/.auth/me').then((response) =>
        response.json(),
      );
      //@ts-expect-error
      this._internals.states.add('loaded');

      appInsights.trackPageView(); // Manually call trackPageView to establish the current user/session/pageview
      this.shadowRoot.querySelector('#loadingContainer')!.remove();
      if (creditentials.clientPrincipal) {
        //@ts-expect-error
        this._internals.states.add('logged');
      }
      const canvasPromise = import('./ui/canvas.js');
      playBtn?.forEach((btn) =>
        btn.addEventListener('click', async () => {
          //@ts-expect-error
          this._internals.states.add('play');
          const { Canvas } = await canvasPromise;
          new Canvas(
            this.shadowRoot!.querySelector('dialog')!,
            this.shadowRoot!.querySelector('canvas')!,
            this.shadowRoot!.querySelector('#progressBarContainer span')!,
            this.shadowRoot!.querySelector('progress')!,
          );
        }),
      );
    }
    async attributeChangedCallback(
      name: string,
      _oldValue: string,
      newValue: string,
    ) {
      console.log('attriute change', name, newValue);
      if (name == 'devtools') {
        const devtools = newValue === 'true';

        if (devtools) {
          this.#devTools = this.shadowRoot!.insertBefore(
            document.createElement('aside'),
            this.#logincontainer,
          );
          const reactContainer = this.#devTools.appendChild(
            document.createElement('div'),
          );
          reactContainer.id = 'DevToolsAppContainer';

          if (!this.#devSheet) {
            const { default: devSheet }: { default: CSSStyleSheet } =
              await import(
                //@ts-expect-error
                '/css/DevTools.css',
                {
                  with: { type: 'css' },
                }
              );
            this.#devSheet = devSheet;
          }
          this.shadowRoot!.adoptedStyleSheets.push(this.#devSheet);
          const { DevTools } = await import('./ui/DevTools/DevTools.js');
          DevTools(this.shadowRoot!.querySelector<HTMLElement>('aside')!);
        } else {
          this.#devTools!.remove();
          this.#devTools = null;
          if (this.#devSheet) {
            this.shadowRoot!.adoptedStyleSheets.splice(
              this.shadowRoot!.adoptedStyleSheets.indexOf(this.#devSheet),
            );
          }
        }
      }
    }
  },
);
