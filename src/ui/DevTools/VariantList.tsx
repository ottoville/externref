import { useEffect, useState } from 'react';
import { Drawable } from '../../GPU/Drawables/Drawable.js';
import type { Engine } from '../../engine.js';
import { ArcRotateCamera } from '../../controllers/ArcRotateCamera.js';
import { DrawableDirect } from '../../GPU/Drawables/DrawableDirect.js';
import { RenderPipeline } from 'webgpu-ts/index.js';
declare const engine: Engine;

export function VariantList(props: {
  variant: RenderPipeline;
  setSelectedDrawable: React.Dispatch<
    React.SetStateAction<Drawable | undefined>
  >;
}) {
  const [rootDrawables, setRootDrawables] = useState<Drawable[]>([]);
  useEffect(() => {
    const listener = () => {
      setRootDrawables(
        props.variant.drawables.filter(
          (drawable): drawable is Drawable => drawable instanceof Drawable,
        ),
      );
    };
    listener();
    props.variant.onDrawableChange.add(listener);
    return () => {
      props.variant.onDrawableChange.delete(listener);
    };
  }, [props.variant.drawables]);

  return (
    <ul>
      {rootDrawables.map((drawable) => {
        return (
          <li
            key={drawable.node.id}
            className={'variant'}
            onClick={() => props.setSelectedDrawable(drawable)}
          >
            <div>{drawable.node.label}</div>
            <button
              className={'btn-small'}
              type="button"
              onClick={() => {
                if (engine.inputManager instanceof ArcRotateCamera) {
                  if (drawable instanceof DrawableDirect) {
                    const node = drawable.node;
                    engine.inputManager.moveto(node.translation);
                  }
                }
              }}
            >
              🎥
            </button>
          </li>
        );
      })}
    </ul>
  );
}
