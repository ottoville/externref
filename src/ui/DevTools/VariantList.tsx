import { useEffect, useState } from 'react';
import { Drawable } from '../../GPU/Drawables/Drawable.js';
import { RenderPipelineVariant } from '../../GPU/RenderPasses/RenderPass.js';
import type { Engine } from '../../engine.js';
import { ArcRotateCamera } from '../../controllers/ArcRotateCamera.js';
import { DrawableDirect } from '../../GPU/Drawables/DrawableDirect.js';
declare const engine: Engine;

export function VariantList(props: {
    variant: RenderPipelineVariant,
    setSelectedDrawable: React.Dispatch<React.SetStateAction<Drawable | undefined>>

}) {
    const [rootDrawables, setRootDrawables] = useState<Drawable[]>([])
    useEffect(() => {
        const listener = () => {
            setRootDrawables([...props.variant.rootDrawables])
        };
        setRootDrawables([...props.variant.rootDrawables]);
        props.variant.onRootDrawableChanges.add(listener);
        return () => {
            props.variant.onRootDrawableChanges.delete(listener)
        }
    }, [props.variant.rootDrawables])

    return <ul>
        {rootDrawables.map(drawable => {
            return <li key={drawable.node.id} className={'variant'}
                onClick={() => props.setSelectedDrawable(drawable)}>
                <div>
                    {drawable.node.label}
                </div>
                <button className={'btn-small'} type="button"
                    onClick={() => {
                        if (engine.inputManager instanceof ArcRotateCamera) {
                            if (drawable instanceof DrawableDirect) {
                                const node = drawable.node;
                                engine.inputManager.moveto(node.translation)
                            }
                        }
                    }}>🎥</button>
            </li>
        })}
    </ul>
}
