import { MainNode } from '../../MainNode.js';
import { ReadOnlyTerraVector3 } from '../../Math.js';
import { useEffect, useRef } from 'react';
import type { Engine } from '../../engine.js';
// Import side effects
import './Slider.jsx';
import type { SliderElement } from './Slider.jsx';
declare const engine: Engine;

export function Rotation({ node }: { node: MainNode }) {
  const rotationX = useRef<SliderElement>(null);
  const rotationY = useRef<SliderElement>(null);
  const rotationZ = useRef<SliderElement>(null);
  /**
   * Rotation that is not set manually in devtools
   */
  const rotation = useRef(new ReadOnlyTerraVector3());
  const rotatedManually = useRef(false);

  const changeRotation = () => {
    if (rotationX.current && rotationY.current && rotationZ.current) {
      console.log('set rotatedManually true');
      rotatedManually.current = true;
      node.euler_angles = [
        rotationX.current.valueAsNumber,
        rotationY.current.valueAsNumber,
        rotationZ.current.valueAsNumber,
      ];
    }
  };

  useEffect(() => {
    const ptr = engine.rust.devtools_pointer();
    const listener = () => {
      if (!rotatedManually.current) {
        rotation.current = new ReadOnlyTerraVector3(
          engine.rust.memory.buffer,
          ptr,
        );
        if (rotationX.current) {
          rotationX.current.valueAsNumber = rotation.current[0];
        }
        if (rotationY.current)
          rotationY.current.valueAsNumber = rotation.current[1];
        if (rotationZ.current)
          rotationZ.current.valueAsNumber = rotation.current[2];
      } else {
        rotatedManually.current = false;
      }
    };
    const inputListener = () => {
      changeRotation();
    };
    rotationX.current?.addEventListener('input', inputListener);
    rotationY.current?.addEventListener('input', inputListener);
    rotationZ.current?.addEventListener('input', inputListener);
    node.onMeshChange.add(listener);
    listener();
    return () => {
      node.onMeshChange.delete(listener);
      rotationX.current?.removeEventListener('input', inputListener);
      rotationY.current?.removeEventListener('input', inputListener);
      rotationZ.current?.removeEventListener('input', inputListener);
    };
  }, [node]);
  return (
    <fieldset>
      <legend>Rotation</legend>
      <slider-label ref={rotationX}></slider-label>
      <br />
      <slider-label ref={rotationY}></slider-label>
      <br />
      <slider-label ref={rotationZ}></slider-label>
    </fieldset>
  );
}
