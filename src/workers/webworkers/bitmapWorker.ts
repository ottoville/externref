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
        const width = data.bitmap.width;

        const split = (data.bitmap.height / data.partcount) | 0;
        const totalbuffer = new Uint8ClampedArray(data.buffer);
        const totalWidth = data.subdivisionsX;
        const buffersplit = split * totalWidth * 4;

        const canvas = new OffscreenCanvas(totalWidth, split);
        const ctx = canvas.getContext("2d")
        if (!ctx)
            throw ('Unable to get 2d context on bitmapworker ' + totalWidth + ' ' + split);

        ctx.drawImage(data.bitmap, 0, split * data.partnumber, width, split, data.align, 0, width, split);
        self.postMessage({ type: 'init', bitmap: data.bitmap }, [data.bitmap]);
        const imgdata = ctx.getImageData(0, 0, totalWidth, split).data;

        totalbuffer.set(imgdata, ((data.align * totalWidth * 4)) + buffersplit * data.partnumber);
        self.postMessage({ type: 'ready' });
        self.close();
        
    } catch (e) {
        if (e instanceof DOMException)
            self.postMessage({ type: 'rejected', data: e.name + ': ' + e.message });
         else
            self.postMessage({ type: 'rejected', data: e });
    }
}