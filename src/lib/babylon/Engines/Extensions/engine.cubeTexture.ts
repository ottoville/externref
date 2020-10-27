import { ThinEngine } from "../../Engines/thinEngine";
import { Logger } from '../../Misc/logger';
import { Nullable } from '../../types';
import { Scene } from '../../scene';
import { IInternalTextureLoader } from '../../Materials/Textures/internalTextureLoader';
import { FileTools } from '../../Misc/fileTools';
import { DepthTextureCreationOptions } from '../depthTextureCreationOptions';
import { IWebRequest } from '../../Misc/interfaces/iWebRequest';

declare module "../../Engines/thinEngine" {
    export interface ThinEngine {
        /**
         * Creates a depth stencil cube texture.
         * This is only available in WebGL 2.
         * @param size The size of face edge in the cube texture.
         * @param options The options defining the cube texture.
         * @returns The cube texture
         */
        _createDepthStencilCubeTexture(size: number, options: DepthTextureCreationOptions): any;

        /**
         * Creates a cube texture
         * @param rootUrl defines the url where the files to load is located
         * @param scene defines the current scene
         * @param files defines the list of files to load (1 per face)
         * @param noMipmap defines a boolean indicating that no mipmaps shall be generated (false by default)
         * @param onLoad defines an optional callback raised when the texture is loaded
         * @param onError defines an optional callback raised if there is an issue to load the texture
         * @param format defines the format of the data
         * @param forcedExtension defines the extension to use to pick the right loader
         * @param createPolynomials if a polynomial sphere should be created for the cube texture
         * @param lodScale defines the scale applied to environment texture. This manages the range of LOD level used for IBL according to the roughness
         * @param lodOffset defines the offset applied to environment texture. This manages first LOD level used for IBL according to the roughness
         * @param fallback defines texture to use while falling back when (compressed) texture file not found.
         * @param excludeLoaders array of texture loaders that should be excluded when picking a loader for the texture (defualt: empty array)
         * @returns the cube texture as an InternalTexture
         */
        createCubeTexture(rootUrl: string, scene: Nullable<Scene>, files: Nullable<string[]>, noMipmap: boolean | undefined,
            onLoad: Nullable<(data?: any) => void>, onError: Nullable<(message?: string, exception?: any) => void>,
            format: number | undefined, forcedExtension: any, createPolynomials: boolean, lodScale: number, lodOffset: number, fallback: Nullable<any>, excludeLoaders: Array<IInternalTextureLoader>): any;

        /**
         * Creates a cube texture
         * @param rootUrl defines the url where the files to load is located
         * @param scene defines the current scene
         * @param files defines the list of files to load (1 per face)
         * @param noMipmap defines a boolean indicating that no mipmaps shall be generated (false by default)
         * @param onLoad defines an optional callback raised when the texture is loaded
         * @param onError defines an optional callback raised if there is an issue to load the texture
         * @param format defines the format of the data
         * @param forcedExtension defines the extension to use to pick the right loader
         * @returns the cube texture as an InternalTexture
         */
        createCubeTexture(rootUrl: string, scene: Nullable<Scene>, files: Nullable<string[]>, noMipmap: boolean,
            onLoad: Nullable<(data?: any) => void>, onError: Nullable<(message?: string, exception?: any) => void>,
            format: number | undefined, forcedExtension: any): any;

        /**
         * Creates a cube texture
         * @param rootUrl defines the url where the files to load is located
         * @param scene defines the current scene
         * @param files defines the list of files to load (1 per face)
         * @param noMipmap defines a boolean indicating that no mipmaps shall be generated (false by default)
         * @param onLoad defines an optional callback raised when the texture is loaded
         * @param onError defines an optional callback raised if there is an issue to load the texture
         * @param format defines the format of the data
         * @param forcedExtension defines the extension to use to pick the right loader
         * @param createPolynomials if a polynomial sphere should be created for the cube texture
         * @param lodScale defines the scale applied to environment texture. This manages the range of LOD level used for IBL according to the roughness
         * @param lodOffset defines the offset applied to environment texture. This manages first LOD level used for IBL according to the roughness
         * @returns the cube texture as an InternalTexture
         */
        createCubeTexture(rootUrl: string, scene: Nullable<Scene>, files: Nullable<string[]>, noMipmap: boolean,
            onLoad: Nullable<(data?: any) => void>, onError: Nullable<(message?: string, exception?: any) => void>,
            format: number | undefined, forcedExtension: any, createPolynomials: boolean, lodScale: number, lodOffset: number): any;

        /** @hidden */
        _partialLoadFile(url: string, index: number, loadedFiles: (string | ArrayBuffer)[], onfinish: (files: (string | ArrayBuffer)[]) => void, onErrorCallBack: Nullable<(message?: string, exception?: any) => void>): void;

        /** @hidden */
        _cascadeLoadFiles(scene: Nullable<Scene>, onfinish: (images: (string | ArrayBuffer)[]) => void, files: string[], onError: Nullable<(message?: string, exception?: any) => void>): void;

        /** @hidden */
        _cascadeLoadImgs(scene: Nullable<Scene>, onfinish: (images: HTMLImageElement[]) => void, files: string[], onError: Nullable<(message?: string, exception?: any) => void>, mimeType?: string): void;

        /** @hidden */
        _partialLoadImg(url: string, index: number, loadedImages: HTMLImageElement[], scene: Nullable<Scene>, onfinish: (images: HTMLImageElement[]) => void, onErrorCallBack: Nullable<(message?: string, exception?: any) => void>, mimeType?: string): void;

        /**
         * @hidden
         */
        _setCubeMapTextureParams(loadMipmap: boolean): void;
    }
}

ThinEngine.prototype._createDepthStencilCubeTexture = function (size: number, options: DepthTextureCreationOptions): any {
   
};

ThinEngine.prototype._partialLoadFile = function(url: string, index: number, loadedFiles: (string | ArrayBuffer)[],
    onfinish: (files: (string | ArrayBuffer)[]) => void, onErrorCallBack: Nullable<(message?: string, exception?: any) => void> = null): void {
    var onload = (data: string | ArrayBuffer) => {
        loadedFiles[index] = data;
        (<any>loadedFiles)._internalCount++;

        if ((<any>loadedFiles)._internalCount === 6) {
            onfinish(loadedFiles);
        }
    };

    const onerror = (request?: IWebRequest, exception?: any) => {
        if (onErrorCallBack && request) {
            onErrorCallBack(request.status + " " + request.statusText, exception);
        }
    };

    this._loadFile(url, onload, undefined, undefined, true, onerror);
};

ThinEngine.prototype._cascadeLoadFiles = function(scene: Nullable<Scene>, onfinish: (images: (string | ArrayBuffer)[]) => void, files: string[], onError: Nullable<(message?: string, exception?: any) => void> = null): void {
    var loadedFiles: (string | ArrayBuffer)[] = [];
    (<any>loadedFiles)._internalCount = 0;

    for (let index = 0; index < 6; index++) {
        this._partialLoadFile(files[index], index, loadedFiles, onfinish, onError);
    }
};

ThinEngine.prototype._cascadeLoadImgs = function(scene: Nullable<Scene>,
    onfinish: (images: HTMLImageElement[]) => void, files: string[], onError: Nullable<(message?: string, exception?: any) => void> = null, mimeType?: string) {

    var loadedImages: HTMLImageElement[] = [];
    (<any>loadedImages)._internalCount = 0;

    for (let index = 0; index < 6; index++) {
        this._partialLoadImg(files[index], index, loadedImages, scene, onfinish, onError, mimeType);
    }
};

ThinEngine.prototype._partialLoadImg = function(url: string, index: number, loadedImages: HTMLImageElement[], scene: Nullable<Scene>,
    onfinish: (images: HTMLImageElement[]) => void, onErrorCallBack: Nullable<(message?: string, exception?: any) => void> = null, mimeType?: string) {

    var img: Nullable<HTMLImageElement>;

    var onload = () => {
        if (img) {
            loadedImages[index] = img;
            (<any>loadedImages)._internalCount++;

            if (scene) {
                scene._removePendingData(img);
            }
        }

        if ((<any>loadedImages)._internalCount === 6) {
            onfinish(loadedImages);
        }
    };

    var onerror = (message?: string, exception?: any) => {
        if (scene) {
            scene._removePendingData(img);
        }

        if (onErrorCallBack) {
            onErrorCallBack(message, exception);
        }
    };

    img = FileTools.LoadImage(url, onload, onerror, scene ? scene.offlineProvider : null, mimeType);
    if (scene && img) {
        scene._addPendingData(img);
    }
};

ThinEngine.prototype._setCubeMapTextureParams = function(loadMipmap: boolean): void {
    var gl = this._gl;
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, loadMipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this._bindTextureDirectly(gl.TEXTURE_CUBE_MAP, null);
};

ThinEngine.prototype.createCubeTexture = function (rootUrl: string, scene: Nullable<Scene>, files: Nullable<string[]>, noMipmap?: boolean, onLoad: Nullable<(data?: any) => void> = null, onError: Nullable<(message?: string, exception?: any) => void> = null, format?: number, forcedExtension: any = null, createPolynomials: boolean = false, lodScale: number = 0, lodOffset: number = 0, fallback: Nullable<any> = null, excludeLoaders: Array<IInternalTextureLoader> = []): any {
   
};
