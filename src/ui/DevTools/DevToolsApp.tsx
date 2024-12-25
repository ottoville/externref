import { createRoot } from 'react-dom/client';
import { Meshes } from './Meshes.jsx';
import { Cameras } from './Cameras.jsx';
import './Lights.js';

export const DevToolsApp = (container: HTMLElement) => {
  const root = createRoot(container.querySelector('#DevToolsAppContainer')!);
  root.render(
    <>
      <Meshes></Meshes>
      <lights-devtool></lights-devtool>
      <Cameras></Cameras>
    </>,
  );
  return root;
};
