import { createRoot } from 'react-dom/client';
import { Meshes } from './Meshes.jsx';
import { Cameras } from './Cameras.jsx';

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
