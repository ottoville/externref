import { createRoot } from 'react-dom/client';
import { Meshes } from './Meshes.js';
import { Cameras } from './Cameras.js';

export const DevToolsApp = (container: HTMLElement) => {
  const root = createRoot(container.querySelector('#DevToolsAppContainer')!);
  root.render(
    <>
      <button
        type="button"
        onClick={() => {
          root.unmount();
          (container.getRootNode() as ShadowRoot).host.setAttribute(
            'devtools',
            'false',
          );
        }}
      >
        Close
      </button>

      <Meshes></Meshes>
      <Cameras></Cameras>
    </>,
  );
};
