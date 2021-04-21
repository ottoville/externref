onmessage = async (e) => {
    try {
        const data: {
            subdivisionsX:number,
            subdivisionsY:number,
            bitmap: ImageBitmap,
            buffer: SharedArrayBuffer,
            partcount: number,
            partnumber: number,
            align: number } = e.data;

        const split = (data.subdivisionsY / data.partcount) | 0;
        const sourceSplit = (data.bitmap.height / data.partcount) | 0;

        const buffersplit = split * data.subdivisionsX * 4;

        const canvas = new OffscreenCanvas(data.subdivisionsX, split);
        const ctx = canvas.getContext("2d")
        if (!ctx)
            throw ('Unable to get 2d context on bitmapworker ' + data.subdivisionsX + ' ' + split);

        ctx.drawImage(data.bitmap, 0, sourceSplit*data.partnumber, data.bitmap.width, data.bitmap.height, data.align, 0, data.subdivisionsX, data.subdivisionsY);
        self.postMessage({ type: 'init', bitmap: data.bitmap }, [data.bitmap]);
        const imgdata = ctx.getImageData(0, 0, data.subdivisionsX, split).data;

        new Uint8ClampedArray(data.buffer).set(imgdata, ((data.align * data.subdivisionsX * 4)) + buffersplit * data.partnumber);
        self.postMessage({ type: 'ready' });
        self.close();
        
    } catch (e) {
        if (e instanceof DOMException)
            self.postMessage({ type: 'rejected', data: e.name + ': ' + e.message });
         else
            self.postMessage({ type: 'rejected', data: e });
    }
}