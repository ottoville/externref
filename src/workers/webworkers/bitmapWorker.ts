onmessage = async (e) => {
    try {
        let data: { bitmap: ImageBitmap, buffer: SharedArrayBuffer, partcount: number, partnumber: number, align: number } = e.data;
        let width = data.bitmap.width;

        let split = (data.bitmap.height / data.partcount) | 0;
        let totalbuffer = new Uint8ClampedArray(data.buffer);

        let totalWidth = 250;
        let buffersplit = split * totalWidth * 4;

        let canvas = new OffscreenCanvas(totalWidth, split);
        let ctx: OffscreenCanvasRenderingContext2D | null;
        if (ctx = canvas.getContext("2d")) {
            ctx.drawImage(data.bitmap, 0, split * data.partnumber  , width, split, data.align, 0, width, split);
            self.postMessage({ type: 'init', bitmap: data.bitmap }, [data.bitmap]);
            let imgdata = ctx.getImageData(0, 0, totalWidth, split).data;


            totalbuffer.set(imgdata, ((data.align * totalWidth * 4)) + buffersplit * data.partnumber);
            self.postMessage({ type: 'ready' });
            self.close();
        }
    } catch (e) {
        if (e instanceof DOMException)
            self.postMessage({ type: 'rejected', data: e.name + ': ' + e.message });
         else
            self.postMessage({ type: 'rejected', data: e });
    }
}