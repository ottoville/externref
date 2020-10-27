import { Logger } from '../../Misc/logger';
import { RenderTargetCreationOptions } from '../../Materials/Textures/renderTargetCreationOptions';
import { Constants } from '../constants';
import { ThinEngine } from '../thinEngine';
import { DepthTextureCreationOptions } from '../depthTextureCreationOptions';

declare module "../../Engines/thinEngine" {
    export interface ThinEngine {
        /**
         * Creates a new render target texture
         * @param size defines the size of the texture
         * @param options defines the options used to create the texture
         * @returns a new render target texture stored in an InternalTexture
         */
        createRenderTargetTexture(size: number | { width: number, height: number }, options: boolean | RenderTargetCreationOptions): any;

        /**
         * Creates a depth stencil texture.
         * This is only available in WebGL 2 or with the depth texture extension available.
         * @param size The size of face edge in the texture.
         * @param options The options defining the texture.
         * @returns The texture
         */
        createDepthStencilTexture(size: number | { width: number, height: number }, options: DepthTextureCreationOptions): any;

        /** @hidden */
        _createDepthStencilTexture(size: number | { width: number, height: number }, options: DepthTextureCreationOptions): any;
    }
}

ThinEngine.prototype.createRenderTargetTexture = function (this: ThinEngine, size: number | { width: number, height: number }, options: boolean | RenderTargetCreationOptions): any {
    let fullOptions = new RenderTargetCreationOptions();

    if (options !== undefined && typeof options === "object") {
        fullOptions.generateMipMaps = options.generateMipMaps;
        fullOptions.generateDepthBuffer = !!options.generateDepthBuffer;
        fullOptions.generateStencilBuffer = !!options.generateStencilBuffer;
        fullOptions.type = options.type === undefined ? Constants.TEXTURETYPE_UNSIGNED_INT : options.type;
        fullOptions.samplingMode = options.samplingMode === undefined ? Constants.TEXTURE_TRILINEAR_SAMPLINGMODE : options.samplingMode;
        fullOptions.format = options.format === undefined ? Constants.TEXTUREFORMAT_RGBA : options.format;
    } else {
        fullOptions.generateMipMaps = <boolean>options;
        fullOptions.generateDepthBuffer = true;
        fullOptions.generateStencilBuffer = false;
        fullOptions.type = Constants.TEXTURETYPE_UNSIGNED_INT;
        fullOptions.samplingMode = Constants.TEXTURE_TRILINEAR_SAMPLINGMODE;
        fullOptions.format = Constants.TEXTUREFORMAT_RGBA;
    }

    if (fullOptions.type === Constants.TEXTURETYPE_FLOAT && !this._caps.textureFloatLinearFiltering) {
        // if floating point linear (gl.FLOAT) then force to NEAREST_SAMPLINGMODE
        fullOptions.samplingMode = Constants.TEXTURE_NEAREST_SAMPLINGMODE;
    }
    else if (fullOptions.type === Constants.TEXTURETYPE_HALF_FLOAT && !this._caps.textureHalfFloatLinearFiltering) {
        // if floating point linear (HALF_FLOAT) then force to NEAREST_SAMPLINGMODE
        fullOptions.samplingMode = Constants.TEXTURE_NEAREST_SAMPLINGMODE;
    }
    var gl = this._gl;

};

ThinEngine.prototype.createDepthStencilTexture = function (size: number | { width: number, height: number }, options: DepthTextureCreationOptions): any {
    if (options.isCube) {
        let width = (<{ width: number, height: number }>size).width || <number>size;
        return this._createDepthStencilCubeTexture(width, options);
    }
    else {
        return this._createDepthStencilTexture(size, options);
    }
};

ThinEngine.prototype._createDepthStencilTexture = function (size: number | { width: number, height: number }, options: DepthTextureCreationOptions): any {
   
};