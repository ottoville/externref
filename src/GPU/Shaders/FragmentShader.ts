import { BGLayout } from '../BindGroupLayout.js';
import { Shader, ShaderParams } from './Shader.js';
import { FilteredBindgroupEntrys, FragmentEntry, FragmentShaderFunction } from './ShaderFunction.js';

export class FragmentShader<
    const B extends readonly BGLayout[] = readonly BGLayout[],
    E extends { [index: string]: FragmentShaderFunction<B> } = { [index: string]: FragmentShaderFunction<B> },
> extends Shader<E> {
    constructor(
        public override props: ShaderParams<E, B>,
        constantCode?: (args: FilteredBindgroupEntrys<B, FragmentEntry>) => string
    ) {
        super(props,
            GPUShaderStage.FRAGMENT,
            //@ts-expect-error TODO
            constantCode);
    }
}
