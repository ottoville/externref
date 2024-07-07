import { createRoot } from 'react-dom/client';
import { Meshes } from './Meshes.js';
import { Cameras } from './Cameras.js';

export const DevToolsApp = (container: HTMLElement) => {
  const root = createRoot(container.querySelector('#DevToolsAppContainer')!);
  root.render(
    <>
      <Meshes></Meshes>
      <Cameras></Cameras>
    </>,
  );
  return root;
};
