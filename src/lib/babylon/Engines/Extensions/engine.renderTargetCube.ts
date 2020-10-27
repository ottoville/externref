import { Logger } from '../../Misc/logger';
import { RenderTargetCreationOptions } from '../../Materials/Textures/renderTargetCreationOptions';
import { Constants } from '../constants';
import { ThinEngine } from '../thinEngine';

declare module "../../Engines/thinEngine" {
    export interface ThinEngine {
        /**
         * Creates a new render target cube texture
         * @param size defines the size of the texture
         * @param options defines the options used to create the texture
         * @returns a new render target cube texture stored in an InternalTexture
         */
        createRenderTargetCubeTexture(size: number, options?: Partial<RenderTargetCreationOptions>): any;
    }
}

ThinEngine.prototype.createRenderTargetCubeTexture = function (size: number, options?: Partial<RenderTargetCreationOptions>): any {
    let fullOptions = {
        generateMipMaps: true,
        generateDepthBuffer: true,
        generateStencilBuffer: false,
        type: Constants.TEXTURETYPE_UNSIGNED_INT,
        samplingMode: Constants.TEXTURE_TRILINEAR_SAMPLINGMODE,
        format: Constants.TEXTUREFORMAT_RGBA,
        ...options
    };
    fullOptions.generateStencilBuffer = fullOptions.generateDepthBuffer && fullOptions.generateStencilBuffer;

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