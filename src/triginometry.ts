//import { rotateMatrix, translate } from "./math.js";

function _bindTextureDirectly(target: number, texture: any, forTextureDataUpdate = false, force = false): boolean {
    let gl: WebGLRenderingContext = this._gl;
    var wasPreviouslyBound = false;
    let isTextureForRendering = texture && texture._associatedChannel > -1;
    if (forTextureDataUpdate && isTextureForRendering) {
        this._activeChannel = texture!._associatedChannel;
    }

    let currentTextureBound = this._boundTexturesCache[this._activeChannel];

    if (currentTextureBound !== texture || force) {
        this._activateCurrentTexture();

        if (texture && texture.isMultiview) {
            gl.bindTexture(target, texture ? texture._colorTextureArray : null);
        } else {
            gl.bindTexture(target, texture ? texture._webGLTexture : null);
        }

        this._boundTexturesCache[this._activeChannel] = texture;

        if (texture) {
            texture._associatedChannel = this._activeChannel;
        }
    } else if (forTextureDataUpdate) {
        wasPreviouslyBound = true;
        this._activateCurrentTexture();
    }

    if (isTextureForRendering && !forTextureDataUpdate) {
        this._bindSamplerUniformToChannel(texture!._associatedChannel, this._activeChannel);
    }

    return wasPreviouslyBound;
}

//https://github.com/BabylonJS/Babylon.js/blob/a7b273c03d231bf33fa0d92818cb9848ded13eb2/src/Engines/engine.ts

// https://github.com/BabylonJS/Babylon.js/blob/9ff58d958c8b2a2e498be661727a8d05f2e377b6/src/Engines/engine.ts
export function updateSubTexture(zonedt: BABYLON.DynamicTexture,
    h: number, w: number, startingPoint: BABYLON.Vector3, ang: Angle, subTexture?: subTexture): subTexture {
    if (ang.rad < 0) {
        throw ('updateSubTexture negative angle not supported');
    }
    let centerX = 5000;
    let centerZ = 5000;

    let texture: BABYLON.InternalTexture = zonedt._texture;
    let gl: WebGLRenderingContext = this._gl;


    let coords: { x: number, z: number }[] = [
        { x: 0, z: 0 },
        { x: 0, z: h },
        { x: w, z: 0 },
        { x: w, z: h }
    ]

    let my = rotateMatrix(ang.rad, "y");
    let translated0 = coords.map(coord => {
        return translate(coord.x, 0, coord.z, my)
    })
    var m1 = new Matrix();
    m1.setRow(0, new Vector4(1, 0, 0, centerX + startingPoint.x));
    m1.setRow(1, new Vector4(0, 1, 0, 0));
    m1.setRow(2, new Vector4(0, 0, 1, centerZ + startingPoint.z));
    m1.setRow(3, new Vector4(0, 0, 0, 1));


    let translated = translated0.map(coord => {
        return translate(coord.x, 0, coord.z, m1)
    })
    let minX = Math.min(...translated.map(t => t.x));
    let minZ = Math.min(...translated.map(t => t.z));
    let maxX = Math.max(...translated.map(t => t.x));
    let maxZ = Math.max(...translated.map(t => t.z));
    gl.bindTexture(gl.TEXTURE_2D, texture._webGLTexture);
    if (typeof (subTexture) !== 'undefined') {
        let c = document.createElement('canvas');
        c.width = subTexture.imageData.width;
        c.height = subTexture.imageData.height
        let ctx = c.getContext("2d");
        ctx.putImageData(subTexture.imageData, 0, 0);
        ctx.translate(0, c.height);
        ctx.scale(1, -1);
        ctx.drawImage(c, 0, 0);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, subTexture.x, subTexture.z, gl.RGBA, gl.UNSIGNED_BYTE, c);
    }

    let c = document.createElement('canvas');
    c.width = maxX - minX;
    c.height = maxZ - minZ;
    let pixels: Uint8Array = new Uint8Array(4 * c.width * c.height);

    if (!this._dummyFramebuffer) {
        let dummy = gl.createFramebuffer();

        if (!dummy) {
            throw new Error("Unable to create dummy framebuffer");
        }
        this._dummyFramebuffer = dummy;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._dummyFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture._webGLTexture, 0);

    gl.readPixels(minX, minZ, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._currentFramebuffer);

    var ctx = c.getContext("2d");
    let imageData = ctx.createImageData(c.width, c.height);
    imageData.data.set(pixels);
    subTexture = { x: minX, z: minZ, imageData: imageData };
    ctx.save();

    ctx.putImageData(imageData, 0, 0);
    ctx.translate(0, c.height);
    ctx.scale(1, -1);
    ctx.drawImage(c, 0, 0);

    ctx.restore();
    ctx.beginPath();
    let absDimensions: { w: number; h: number } = { w: Math.abs(w), h: Math.abs(h) }
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(ang.rad);
    ctx.translate(c.width / -2, c.height / -2);
    ctx.translate((c.width - absDimensions.w) / 2, (c.height - absDimensions.h) / 2);
    ctx.fillStyle = "red";
    ctx.rect(0, 0, absDimensions.w, absDimensions.h);

    ctx.fill();

    gl.texSubImage2D(gl.TEXTURE_2D, 0, minX, minZ, gl.RGBA, gl.UNSIGNED_BYTE, c);
    return subTexture;
}