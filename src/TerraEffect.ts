import type { ThinEngine } from "babylonjs/Engines/thinEngine.js";
import type { IEffectFallbacks } from "./lib/babylon/Materials/iEffectFallbacks.js";
import { Observable } from "./lib/babylon/Misc/observable.js";
import type { DataBuffer } from "./lib/babylon/Meshes/dataBuffer.js";
import type { IPipelineContext } from "./lib/babylon/Engines/IPipelineContext.js";
import type { Engine } from "./lib/babylon/Engines/engine.js";
import type { ShaderProcessingContext, ProcessingOptions } from "./lib/babylon/Engines/Processors/shaderProcessingOptions.js";
import { ShaderProcessor } from "./lib/babylon/Engines/Processors/shaderProcessor.js";
import type { BaseTexture } from "./lib/babylon/Materials/Textures/baseTexture.js";
import type { PostProcess } from "./lib/babylon/PostProcesses/postProcess.js";
import type { IColor4Like, IVector4Like, IMatrixLike, IVector2Like, IVector3Like, IColor3Like } from "./lib/babylon/Maths/math.like.js";
import type { WebGPUPipelineContext } from "./lib/babylon/Engines/WebGPU/webgpuPipelineContext.js";
import type { WebGPUEngine } from "./lib/babylon/Engines/webgpuEngine.js";
import { WebGPUConstants } from "./lib/babylon/Engines/WebGPU/webgpuConstants.js";

//@ts-ignore
/*ShaderProcessor._FileToolsLoadFile = function (url, onSuccess) {
    caches.match(url).then(async response => {
        if (!response)
            response = await fetch(url);
        onSuccess(await response.text());
    })
}*/
export class TerraEffect {
    /**
   * Release all associated resources.
   **/
    public dispose() {
        if (this._pipelineContext) {
            this._pipelineContext.dispose();
        }
        this._engine._releaseEffect(<unknown>this as any);
    }
    /**
     * Checks if the effect is supported. (Must be called after compilation)
     */
    public get isSupported(): boolean {
        return this._compilationError === "";
    }

    /**
     * Binds a texture to the engine to be used as output of the shader.
     * @param channel Name of the output variable.
     * @param texture Texture to bind.
     * @hidden
     */
    public _bindTexture(channel: string, texture: Nullable<any>): void {
        //@ts-ignore
        this._engine._bindTexture(this._samplers[channel], texture);
    }

    /**
     * Sets a texture on the engine to be used in the shader.
     * @param channel Name of the sampler variable.
     * @param texture Texture to set.
     */
    public setTexture(channel: string, texture: Nullable<BaseTexture>): void {
        this._engine.setTexture(this._samplers[channel], this._uniforms[channel], texture, channel);
    }

    /**
     * Sets a depth stencil texture from a render target on the engine to be used in the shader.
     * @param channel Name of the sampler variable.
     * @param texture Texture to set.
     */
    public setDepthStencilTexture(channel: string, texture: Nullable<any>): void {
        this._engine.setDepthStencilTexture(this._samplers[channel], this._uniforms[channel], texture);
    }

    /**
     * Sets an array of textures on the engine to be used in the shader.
     * @param channel Name of the variable.
     * @param textures Textures to set.
     */
    public setTextureArray(channel: string, textures: BaseTexture[]): void {
        let exName = channel + "Ex";
        if (this._samplerList.indexOf(exName + "0") === -1) {
            const initialPos = this._samplerList.indexOf(channel);
            for (var index = 1; index < textures.length; index++) {
                const currentExName = exName + (index - 1).toString();
                this._samplerList.splice(initialPos + index, 0, currentExName);
            }

            // Reset every channels
            let channelIndex = 0;
            for (var key of this._samplerList) {
                this._samplers[key] = channelIndex;
                channelIndex += 1;
            }
        }

        this._engine.setTextureArray(this._samplers[channel], this._uniforms[channel], textures);
    }

    /**
     * Sets a texture to be the input of the specified post process. (To use the output, pass in the next post process in the pipeline)
     * @param channel Name of the sampler variable.
     * @param postProcess Post process to get the input texture from.
     */
    public setTextureFromPostProcess(channel: string, postProcess: Nullable<PostProcess>): void {
        this._engine.setTextureFromPostProcess(this._samplers[channel], postProcess);
    }

    /**
     * (Warning! setTextureFromPostProcessOutput may be desired instead)
     * Sets the input texture of the passed in post process to be input of this effect. (To use the output of the passed in post process use setTextureFromPostProcessOutput)
     * @param channel Name of the sampler variable.
     * @param postProcess Post process to get the output texture from.
     */
    public setTextureFromPostProcessOutput(channel: string, postProcess: Nullable<PostProcess>): void {
        this._engine.setTextureFromPostProcessOutput(this._samplers[channel], postProcess);
    }

    /**
     * Binds a buffer to a uniform.
     * @param buffer Buffer to bind.
     * @param name Name of the uniform variable to bind to.
     */
    public bindUniformBuffer(buffer: DataBuffer, name: string): void {
        let bufferName = this._uniformBuffersNames[name];
        if (bufferName === undefined || TerraEffect._baseCache[bufferName] === buffer) {
            return;
        }
        TerraEffect._baseCache[bufferName] = buffer;
        this._engine.bindUniformBufferBase(buffer, bufferName, name);
    }

    /**
     * Binds block to a uniform.
     * @param blockName Name of the block to bind.
     * @param index Index to bind.
     */
    public bindUniformBlock(blockName: string, index: number): void {
        this._engine.bindUniformBlock(this._pipelineContext!, blockName, index);
    }

    /**
     * Sets an interger value on a uniform variable.
     * @param uniformName Name of the variable.
     * @param value Value to be set.
     * @returns this effect.
     */
    public setInt(uniformName: string, value: number): TerraEffect {
        this._pipelineContext!.setInt(uniformName, value);
        return this;
    }

    /**
     * Sets an int array on a uniform variable.
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setIntArray(uniformName: string, array: Int32Array): TerraEffect {
        this._pipelineContext!.setIntArray(uniformName, array);
        return this;
    }

    /**
     * Sets an int array 2 on a uniform variable. (Array is specified as single array eg. [1,2,3,4] will result in [[1,2],[3,4]] in the shader)
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setIntArray2(uniformName: string, array: Int32Array): TerraEffect {
        this._pipelineContext!.setIntArray2(uniformName, array);
        return this;
    }

    /**
     * Sets an int array 3 on a uniform variable. (Array is specified as single array eg. [1,2,3,4,5,6] will result in [[1,2,3],[4,5,6]] in the shader)
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setIntArray3(uniformName: string, array: Int32Array): TerraEffect {
        this._pipelineContext!.setIntArray3(uniformName, array);
        return this;
    }

    /**
     * Sets an int array 4 on a uniform variable. (Array is specified as single array eg. [1,2,3,4,5,6,7,8] will result in [[1,2,3,4],[5,6,7,8]] in the shader)
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setIntArray4(uniformName: string, array: Int32Array): TerraEffect {
        this._pipelineContext!.setIntArray4(uniformName, array);
        return this;
    }

    /**
     * Sets an float array on a uniform variable.
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setFloatArray(uniformName: string, array: any): TerraEffect {
        this._pipelineContext!.setArray(uniformName, array);
        return this;
    }

    /**
     * Sets an float array 2 on a uniform variable. (Array is specified as single array eg. [1,2,3,4] will result in [[1,2],[3,4]] in the shader)
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setFloatArray2(uniformName: string, array: any): TerraEffect {
        this._pipelineContext!.setArray2(uniformName, array);
        return this;
    }

    /**
     * Sets an float array 3 on a uniform variable. (Array is specified as single array eg. [1,2,3,4,5,6] will result in [[1,2,3],[4,5,6]] in the shader)
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setFloatArray3(uniformName: string, array: any): TerraEffect {
        this._pipelineContext!.setArray3(uniformName, array);
        return this;
    }

    /**
     * Sets an float array 4 on a uniform variable. (Array is specified as single array eg. [1,2,3,4,5,6,7,8] will result in [[1,2,3,4],[5,6,7,8]] in the shader)
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setFloatArray4(uniformName: string, array: any): TerraEffect {
        this._pipelineContext!.setArray4(uniformName, array);
        return this;
    }

    /**
     * Sets an array on a uniform variable.
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setArray(uniformName: string, array: number[]): TerraEffect {
        this._pipelineContext!.setArray(uniformName, array);
        return this;
    }

    /**
     * Sets an array 2 on a uniform variable. (Array is specified as single array eg. [1,2,3,4] will result in [[1,2],[3,4]] in the shader)
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setArray2(uniformName: string, array: number[]): TerraEffect {
        this._pipelineContext!.setArray2(uniformName, array);
        return this;
    }

    /**
     * Sets an array 3 on a uniform variable. (Array is specified as single array eg. [1,2,3,4,5,6] will result in [[1,2,3],[4,5,6]] in the shader)
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setArray3(uniformName: string, array: number[]): TerraEffect {
        this._pipelineContext!.setArray3(uniformName, array);
        return this;
    }

    /**
     * Sets an array 4 on a uniform variable. (Array is specified as single array eg. [1,2,3,4,5,6,7,8] will result in [[1,2,3,4],[5,6,7,8]] in the shader)
     * @param uniformName Name of the variable.
     * @param array array to be set.
     * @returns this effect.
     */
    public setArray4(uniformName: string, array: number[]): TerraEffect {
        this._pipelineContext!.setArray4(uniformName, array);
        return this;
    }

    /**
     * Sets matrices on a uniform variable.
     * @param uniformName Name of the variable.
     * @param matrices matrices to be set.
     * @returns this effect.
     */
    public setMatrices(uniformName: string, matrices: Float32Array): TerraEffect {
        this._pipelineContext!.setMatrices(uniformName, matrices);
        return this;
    }

    /**
     * Sets matrix on a uniform variable.
     * @param uniformName Name of the variable.
     * @param matrix matrix to be set.
     * @returns this effect.
     */
    public setMatrix(uniformName: string, matrix: IMatrixLike): TerraEffect {
        this._pipelineContext!.setMatrix(uniformName, matrix);
        return this;
    }

    /**
     * Sets a 3x3 matrix on a uniform variable. (Speicified as [1,2,3,4,5,6,7,8,9] will result in [1,2,3][4,5,6][7,8,9] matrix)
     * @param uniformName Name of the variable.
     * @param matrix matrix to be set.
     * @returns this effect.
     */
    public setMatrix3x3(uniformName: string, matrix: Float32Array): TerraEffect {
        this._pipelineContext!.setMatrix3x3(uniformName, matrix);
        return this;
    }

    /**
     * Sets a 2x2 matrix on a uniform variable. (Speicified as [1,2,3,4] will result in [1,2][3,4] matrix)
     * @param uniformName Name of the variable.
     * @param matrix matrix to be set.
     * @returns this effect.
     */
    public setMatrix2x2(uniformName: string, matrix: Float32Array): TerraEffect {
        this._pipelineContext!.setMatrix2x2(uniformName, matrix);
        return this;
    }

    /**
     * Sets a float on a uniform variable.
     * @param uniformName Name of the variable.
     * @param value value to be set.
     * @returns this effect.
     */
    public setFloat(uniformName: string, value: number): TerraEffect {
        this._pipelineContext!.setFloat(uniformName, value);
        return this;
    }

    /**
     * Sets a boolean on a uniform variable.
     * @param uniformName Name of the variable.
     * @param bool value to be set.
     * @returns this effect.
     */
    public setBool(uniformName: string, bool: boolean): TerraEffect {
        this._pipelineContext!.setInt(uniformName, bool ? 1 : 0);
        return this;
    }

    /**
     * Sets a Vector2 on a uniform variable.
     * @param uniformName Name of the variable.
     * @param vector2 vector2 to be set.
     * @returns this effect.
     */
    public setVector2(uniformName: string, vector2: IVector2Like): TerraEffect {
        this._pipelineContext!.setVector2(uniformName, vector2);
        return this;
    }

    /**
     * Sets a float2 on a uniform variable.
     * @param uniformName Name of the variable.
     * @param x First float in float2.
     * @param y Second float in float2.
     * @returns this effect.
     */
    public setFloat2(uniformName: string, x: number, y: number): TerraEffect {
        this._pipelineContext!.setFloat2(uniformName, x, y);
        return this;
    }

    /**
     * Sets a Vector3 on a uniform variable.
     * @param uniformName Name of the variable.
     * @param vector3 Value to be set.
     * @returns this effect.
     */
    public setVector3(uniformName: string, vector3: IVector3Like): TerraEffect {
        this._pipelineContext!.setVector3(uniformName, vector3);
        return this;
    }

    /**
     * Sets a float3 on a uniform variable.
     * @param uniformName Name of the variable.
     * @param x First float in float3.
     * @param y Second float in float3.
     * @param z Third float in float3.
     * @returns this effect.
     */
    public setFloat3(uniformName: string, x: number, y: number, z: number): TerraEffect {
        this._pipelineContext!.setFloat3(uniformName, x, y, z);
        return this;
    }

    /**
     * Sets a Vector4 on a uniform variable.
     * @param uniformName Name of the variable.
     * @param vector4 Value to be set.
     * @returns this effect.
     */
    public setVector4(uniformName: string, vector4: IVector4Like): TerraEffect {
        this._pipelineContext!.setVector4(uniformName, vector4);
        return this;
    }

    /**
     * Sets a float4 on a uniform variable.
     * @param uniformName Name of the variable.
     * @param x First float in float4.
     * @param y Second float in float4.
     * @param z Third float in float4.
     * @param w Fourth float in float4.
     * @returns this effect.
     */
    public setFloat4(uniformName: string, x: number, y: number, z: number, w: number): TerraEffect {
        this._pipelineContext!.setFloat4(uniformName, x, y, z, w);
        return this;
    }

    /**
     * Sets a Color3 on a uniform variable.
     * @param uniformName Name of the variable.
     * @param color3 Value to be set.
     * @returns this effect.
     */
    public setColor3(uniformName: string, color3: IColor3Like): TerraEffect {
        this._pipelineContext!.setColor3(uniformName, color3);
        return this;
    }

    /**
     * Sets a Color4 on a uniform variable.
     * @param uniformName Name of the variable.
     * @param color3 Value to be set.
     * @param alpha Alpha value to be set.
     * @returns this effect.
     */
    public setColor4(uniformName: string, color3: IColor3Like, alpha: number): TerraEffect {
        this._pipelineContext!.setColor4(uniformName, color3, alpha);
        return this;
    }

    /**
     * Sets a Color4 on a uniform variable
     * @param uniformName defines the name of the variable
     * @param color4 defines the value to be set
     * @returns this effect.
     */
    public setDirectColor4(uniformName: string, color4: IColor4Like): TerraEffect {
        this._pipelineContext!.setDirectColor4(uniformName, color4);
        return this;
    }

    /**
     * Adds a callback to the onCompiled observable and call the callback imediatly if already ready.
     * @param func The callback to be used.
     */
    public executeWhenCompiled(func: (effect: TerraEffect) => void): void {
        if (this.isReady()) {
            func(this);
            return;
        }

        this.onCompileObservable.add((effect) => {
            func(effect);
        });

        if (!this._pipelineContext || this._pipelineContext.isAsync) {
            setTimeout(() => {
                this._checkIsReady(null);
            }, 16);
        }
    }
    /**
 * Unique key for this effect
 */
    public get key(): string {
        return this._key;
    }
    /**
 * If the effect has been compiled and prepared.
 * @returns if the effect is compiled and prepared.
 */
    public isReady(): boolean {
        try {
            return this._isReadyInternal();
        }
        catch {
            return false;
        }
    }
    /**
 * The engine the effect was initialized with.
 * @returns the engine.
 */
    public getEngine(): Engine {
        return this._engine;
    }

    /**
     * The pipeline context for this effect
     * @returns the associated pipeline context
     */
    public getPipelineContext(): Nullable<IPipelineContext> {
        return this._pipelineContext;
    }

    /**
     * The set of names of attribute variables for the shader.
     * @returns An array of attribute names.
     */
    public getAttributesNames(): string[] {
        return this._attributesNames;
    }

    /**
     * Returns the attribute at the given index.
     * @param index The index of the attribute.
     * @returns The location of the attribute.
     */
    public getAttributeLocation(index: number): number {
        return this._attributes[index];
    }

    /**
     * Returns the attribute based on the name of the variable.
     * @param name of the attribute to look up.
     * @returns the attribute location.
     */
    public getAttributeLocationByName(name: string): number {
        return this._attributeLocationByName[name];
    }

    /**
     * The number of attributes.
     * @returns the numnber of attributes.
     */
    public getAttributesCount(): number {
        return this._attributes.length;
    }

    /**
     * Gets the index of a uniform variable.
     * @param uniformName of the uniform to look up.
     * @returns the index.
     */
    public getUniformIndex(uniformName: string): number {
        return this._uniformsNames.indexOf(uniformName);
    }

    /**
     * Returns the attribute based on the name of the variable.
     * @param uniformName of the uniform to look up.
     * @returns the location of the uniform.
     */
    public getUniform(uniformName: string): Nullable<WebGLUniformLocation> {
        return this._uniforms[uniformName];
    }

    /**
     * Returns an array of sampler variable names
     * @returns The array of sampler variable neames.
     */
    public getSamplers(): string[] {
        return this._samplerList;
    }

    /**
     * The error from the last compilation.
     * @returns the error string.
     */
    public getCompilationError(): string {
        return this._compilationError;
    }

    /**
     * Gets a boolean indicating that all fallbacks were used during compilation
     * @returns true if all fallbacks were used
     */
    public allFallbacksProcessed(): boolean {
        return this._allFallbacksProcessed;
    }
    public static ShadersRepository = "/shaders/";
    /**
     * Name of the effect.
     */
    public name: any = null;
    /**
     * String container all the define statements that should be set on the shader.
     */
    public defines: string = "";
    /**
     * Callback that will be called when the shader is compiled.
     */
    public onCompiled: Promise<void> = new Promise(() => {
    });
   
    /**
     * Callback that will be called if an error occurs during shader compilation.
     */
    public onError: Nullable<(effect: TerraEffect | any, errors: string) => void> = null;
    /**
     * Callback that will be called when effect is bound.
     */
    public onBind: Nullable<(effect: any) => void> = null;
    /**
     * Unique ID of the effect.
     */
    public uniqueId = 0;
    /**
     * Observable that will be called when the shader is compiled.
     * It is recommended to use executeWhenCompile() or to make sure that scene.isReady() is called to get this observable raised.
     */
    public onCompileObservable = new Observable<TerraEffect>();

    /**
     * Observable that will be called if an error occurs during shader compilation.
     */
    public onErrorObservable = new Observable<TerraEffect>();

    /** @hidden */
    public _onBindObservable: Nullable<Observable<any>> = null;

    /**
     * @hidden
     * Specifies if the effect was previously ready
     */
    public _wasPreviouslyReady = false;
    /**
         * Observable that will be called when effect is bound.
         */
    public get onBindObservable(): Observable<any> {
        if (!this._onBindObservable) {
            this._onBindObservable = new Observable<any>();
        }

        return this._onBindObservable;
    }

    /** @hidden */
    public _bonesComputationForcedToCPU = false;
    /** @hidden */
    public _uniformBuffersNames: { [key: string]: number } = {};
    /** @hidden */
    public _samplerList: string[];

    private static _uniqueIdSeed = 0;
    private _engine: WebGPUEngine;
    private _uniformsNames: string[];
    private _samplers: { [key: string]: number } = {};
    private _isReady = false;
    private _compilationError = "";
    private _allFallbacksProcessed = false;
    private _attributesNames: string[];
    private _attributes: number[] = [];
    private _attributeLocationByName: { [name: string]: number };
    private _uniforms: { [key: string]: Nullable<WebGLUniformLocation> } = {};
    /**
     * Key for the effect.
     * @hidden
     */
    public _key: string = "";
    private _indexParameters: any;
    private _fallbacks: Nullable<IEffectFallbacks> = null;
    /**
     * Compiled shader to webGL program.
     * @hidden
     */
    public _pipelineContext: Nullable<WebGPUPipelineContext> = null;
    /** @hidden */
    public _vertexSourceCode: string = "";
    /** @hidden */
    public _fragmentSourceCode: string = "";

    private static _baseCache: { [key: number]: DataBuffer } = {};
    private _processingContext: Nullable<ShaderProcessingContext> = null;

    public static IncludesShadersStore: { [key: string]: string } = {};

    public getPipelineLayout(): GPUPipelineLayout {
        const bindGroupLayouts: GPUBindGroupLayout[] = [];
        const webgpuPipelineContext = this._pipelineContext;
        for (let i = 0; i < webgpuPipelineContext!.orderedUBOsAndSamplers.length; i++) {
            const setDefinition = webgpuPipelineContext!.orderedUBOsAndSamplers[i];
            if (setDefinition === undefined) {
 //@ts-ignore
                const entries: GPUBindGroupLayoutEntry[] = [];
                const uniformsBindGroupLayout = this._engine.getDevice().createBindGroupLayout({
                    entries,
                });
                bindGroupLayouts[i] = uniformsBindGroupLayout;
                continue;
            }
 //@ts-ignore
            const bindings: GPUBindGroupLayoutEntry[] = [];
            for (let j = 0; j < setDefinition.length; j++) {
                const bindingDefinition = webgpuPipelineContext!.orderedUBOsAndSamplers[i][j];
                if (bindingDefinition === undefined) {
                    continue;
                }

                // TODO WEBGPU. Optimize shared samplers visibility for vertex/framgent.
                if (bindingDefinition.isSampler) {
                    bindings.push({
                        binding: j,
                        visibility: WebGPUConstants.GPUShaderStageBit_VERTEX | WebGPUConstants.GPUShaderStageBit_FRAGMENT,
                        type: WebGPUConstants.GPUBindingType_sampledTexture,
                        //@ts-ignore
                        textureDimension: bindingDefinition.textureDimension,
                        // TODO WEBGPU. Handle texture component type properly.
                        // textureComponentType?: GPUTextureComponentType,
                    }, {
                        // TODO WEBGPU. No Magic + 1 (coming from current 1 texture 1 sampler startegy).
                        binding: j + 1,
                        visibility: WebGPUConstants.GPUShaderStageBit_VERTEX | WebGPUConstants.GPUShaderStageBit_FRAGMENT,
                        type: WebGPUConstants.GPUBindingType_sampler
                    });
                }
                else {
                    bindings.push({
                        binding: j,
                        visibility: WebGPUConstants.GPUShaderStageBit_VERTEX | WebGPUConstants.GPUShaderStageBit_FRAGMENT,
                        type: WebGPUConstants.GPUBindingType_uniformBuffer,
                    });
                }
            }

            if (bindings.length > 0) {
                const uniformsBindGroupLayout = this._engine.getDevice().createBindGroupLayout({
                    entries: bindings,
                });
                bindGroupLayouts[i] = uniformsBindGroupLayout;
            }
        }

        webgpuPipelineContext!.bindGroupLayouts = bindGroupLayouts;
        return this._engine.getDevice().createPipelineLayout({ bindGroupLayouts });
    }
    constructor(baseName: any, attributesNamesOrOptions: string[] | any, uniformsNamesOrEngine: string[] | ThinEngine, samplers: Nullable<string[]> = null,

        engine?: ThinEngine, defines: Nullable<string> = null,
        fallbacks: Nullable<IEffectFallbacks> = null) {
        //super(baseName, attributesNamesOrOptions, uniformsNamesOrEngine, samplers, engine, defines, fallbacks, onCompiled, onError, indexParameters, key, sources);
        this.name = baseName;
        if ((<any>attributesNamesOrOptions).attributes) {
            var options = <any>attributesNamesOrOptions;
            this._engine = <WebGPUEngine>uniformsNamesOrEngine;

            this._attributesNames = options.attributes;
            this._uniformsNames = options.uniformsNames.concat(options.samplers);
            this._samplerList = options.samplers.slice();
            this.defines = options.defines;
            //@ts-ignore
            this.onError = options.onError;
            this._fallbacks = options.fallbacks;
            this._indexParameters = options.indexParameters;

            if (options.uniformBuffersNames) {
                for (var i = 0; i < options.uniformBuffersNames.length; i++) {
                    this._uniformBuffersNames[options.uniformBuffersNames[i]] = i;
                }
            }
        } else {
            this._engine = <WebGPUEngine>engine;
            this.defines = (defines == null ? "" : defines);
            this._uniformsNames = (<string[]>uniformsNamesOrEngine).concat(<string[]>samplers);
            this._samplerList = samplers ? <string[]>samplers.slice() : [];
            this._attributesNames = (<string[]>attributesNamesOrOptions);
            //@ts-ignore
            this.onError = onError;

            this._fallbacks = fallbacks;
        }

        this._attributeLocationByName = {};

        this.uniqueId = TerraEffect._uniqueIdSeed++;

        /*if (sources) {
            Promise.all(sources).then((r) => {
                [this._vertexSourceCodeOverride, this._fragmentSourceCodeOverride] = r;
                this._prepareEffect();
            });            
            return;
        }*/

        this._processingContext = (engine as WebGPUEngine)!._getShaderProcessingContext();


        var vertexSource: any;
        var fragmentSource: any;

        if (baseName.vertexSource) {
            vertexSource = "source:" + baseName.vertexSource;
        } else if (baseName.vertexElement) {
            vertexSource = baseName.vertexElement;
        } else {
            vertexSource = baseName.vertex || baseName;
        }

        if (baseName.fragmentSource) {
            fragmentSource = "source:" + baseName.fragmentSource;
        } else if (baseName.fragmentElement) {
            fragmentSource = baseName.fragmentElement;
        } else {
            fragmentSource = baseName.fragment || baseName;
        }
        //@ts-ignore
        const processorOptions: ProcessingOptions = {
            defines: this.defines.split("\n"),
            indexParameters: this._indexParameters,
            shouldUseHighPrecisionShader: (this._engine as WebGPUEngine)._shouldUseHighPrecisionShader,
            processor: this._engine._shaderProcessor,
            supportsUniformBuffers: this._engine.supportsUniformBuffers,
            shadersRepository: TerraEffect.ShadersRepository,
            includesShadersStore: TerraEffect.IncludesShadersStore,
            version: (this._engine.webGLVersion * 100).toString(),
            platformName: this._engine.shaderPlatformName,
            processingContext: this._processingContext
        };
       
        //@ts-ignore
        if (attributesNamesOrOptions.preprocessed) {
           /* Promise.all(sources).then(r => {
                const [migratedVertexCode, migratedFragmentCode] = r;
                const finalShaders = ShaderProcessor.Finalize(migratedVertexCode, migratedFragmentCode, processorOptions);
                this._vertexSourceCodeOverride = finalShaders.vertexCode;
                this._fragmentSourceCodeOverride = finalShaders.fragmentCode;
                this._useFinalCode(finalShaders.vertexCode, finalShaders.fragmentCode, false);
            })*/
        }
        else {
            Promise.all([
                TerraEffect._loadShader2(vertexSource+".vert").then(vertexCode => TerraEffect.Process(vertexCode, Object.assign({ isFragment: false }, processorOptions))),
                TerraEffect._loadShader2(fragmentSource+".frag")
            ]).then(async (r: [string, string]) => {
                let [migratedVertexCode, fragmentCode] = r;
                let migratedFragmentCode = await TerraEffect.Process(fragmentCode, Object.assign({ isFragment: true }, processorOptions));
                const finalShaders = ShaderProcessor.Finalize(migratedVertexCode, migratedFragmentCode, processorOptions);
                caches.open('finalShaders').then((cache) => {
                    cache.put(vertexSource + '.vert', new Response(new Blob([finalShaders.vertexCode], { type: 'text/plain' })));
                    cache.put(fragmentSource + '.frag', new Response(new Blob([finalShaders.fragmentCode], { type: 'text/plain' })));
                })
            });
        }
    }
    public static Process(sourceCode: string, options: ProcessingOptions): Promise<string> {
        return TerraEffect._ProcessIncludes(sourceCode, options).then(codeWithIncludes =>
            TerraEffect._ProcessShaderConversion(codeWithIncludes, options)
        );
    }
    private static _ProcessShaderConversion(sourceCode: String, options: ProcessingOptions): string {
        //@ts-ignore
        var preparedSourceCode = ShaderProcessor._ProcessPrecision(sourceCode, options);
        if (!options.processor) {
            return preparedSourceCode;
        }

        // Already converted
        if (preparedSourceCode.indexOf("#version 3") !== -1) {
            return preparedSourceCode.replace("#version 300 es", "");
        }

        let defines = options.defines;
        //@ts-ignore
        let preprocessors = ShaderProcessor._PreparePreProcessors(options);

        // General pre processing
        if (options.processor.preProcessor) {
            preparedSourceCode = options.processor.preProcessor(preparedSourceCode, defines, options.isFragment, options.processingContext);
        }
        //@ts-ignore
        preparedSourceCode = ShaderProcessor._EvaluatePreProcessors(preparedSourceCode, preprocessors, options);
        // Post processing
        if (options.processor.postProcessor) {
            preparedSourceCode = options.processor.postProcessor(preparedSourceCode, defines, options.isFragment, options.processingContext);
        }

        return preparedSourceCode;
    }
    private static _ProcessIncludes(sourceCode: string, options: ProcessingOptions): Promise<String> {
        return new Promise(res => {
            var regex = /#include<(.+)>(\((.*)\))*(\[(.*)\])*/g;
            var match = regex.exec(sourceCode);

            var returnValue = new String(sourceCode);

            while (match != null) {
                var includeFile = match[1];

                // Uniform declaration
                if (includeFile.indexOf("__decl__") !== -1) {
                    includeFile = includeFile.replace(/__decl__/, "");
                    if (options.supportsUniformBuffers) {
                        includeFile = includeFile.replace(/Vertex/, "Ubo");
                        includeFile = includeFile.replace(/Fragment/, "Ubo");
                    }
                    includeFile = includeFile + "Declaration";
                }
                if (options.includesShadersStore[includeFile]) {
                    // Substitution
                    var includeContent = options.includesShadersStore[includeFile];
                    if (match[2]) {
                        var splits = match[3].split(",");

                        for (var index = 0; index < splits.length; index += 2) {
                            var source = new RegExp(splits[index], "g");
                            var dest = splits[index + 1];

                            includeContent = includeContent.replace(source, dest);
                        }
                    }


                    // Replace
                    returnValue = returnValue.replace(match[0], includeContent);
                } else {
                    var includeShaderUrl = options.shadersRepository + "ShadersInclude/" + includeFile + ".fx";

                    ShaderProcessor._FileToolsLoadFile(includeShaderUrl, async (fileContent) => {
                        options.includesShadersStore[includeFile] = fileContent as string;

                        res(await this._ProcessIncludes(<string>returnValue, options));
                    });
                    return;
                }

                match = regex.exec(sourceCode);
            }
            res(returnValue);
        });
    }
    private _processCompilationErrors(e: any, previousPipelineContext: Nullable<WebGPUPipelineContext> = null) {
        this._compilationError = e.message;
        let attributesNames = this._attributesNames;
        let fallbacks = this._fallbacks;

        // Let's go through fallbacks then
        console.error("Unable to compile effect:");
        console.error("Uniforms: " + this._uniformsNames.map(function (uniform) {
            return " " + uniform;
        }));
        console.error("Attributes: " + attributesNames.map(function (attribute) {
            return " " + attribute;
        }));
        console.error("Defines:\r\n" + this.defines);
        console.error("Error: " + this._compilationError);
        if (previousPipelineContext) {
            this._pipelineContext = previousPipelineContext;
            this._isReady = true;
            if (this.onError) {
                this.onError(this, this._compilationError);
            }
            this.onErrorObservable.notifyObservers(this);
        }

        if (fallbacks) {
            this._pipelineContext = null;
            if (fallbacks.hasMoreFallbacks) {
                this._allFallbacksProcessed = false;
                console.error("Trying next fallback.");
                this.defines = fallbacks.reduce(this.defines, <unknown>this as any);
            } else { // Sorry we did everything we can
                this._allFallbacksProcessed = true;
                if (this.onError) {
                    this.onError(this, this._compilationError);
                }
                this.onErrorObservable.notifyObservers(this);
                this.onErrorObservable.clear();

                // Unbind mesh reference in fallbacks
                if (this._fallbacks) {
                    this._fallbacks.unBindMesh();
                }
            }
        } else {
            this._allFallbacksProcessed = true;
        }
    }
    static _loadShader2(shader: any) : Promise<string> {
        var shaderUrl = TerraEffect.ShadersRepository + shader;
        // Vertex shader
        return caches.match(shaderUrl).then(async response => {
            if (!response)
                response = await fetch(shaderUrl);
            return response.text();
        })
    }
    private _isReadyInternal(): boolean {
        if (this._isReady) {
            return true;
        }
        if (this._pipelineContext) {
            return this._pipelineContext.isReady;
        }
        return false;
    }
    private _checkIsReady(previousPipelineContext: Nullable<WebGPUPipelineContext>) {
        try {
            if (this._isReadyInternal()) {
                return;
            }
        } catch (e) {
            this._processCompilationErrors(e, previousPipelineContext);
            return;
        }

        setTimeout(() => {
            this._checkIsReady(previousPipelineContext);
        }, 16);
    }
}