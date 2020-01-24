onmessage = async (e) => {
    let data: { bitmap: ImageBitmap, buffer: SharedArrayBuffer, partcount: number, partnumber: number } = e.data;
    let width = data.bitmap.width;
    let height = data.bitmap.height;
    let split = (data.bitmap.height / data.partcount) | 0;
    let totalbuffer = new Uint8ClampedArray(data.buffer);
    let buffersplit = totalbuffer.length / data.partcount
    let canvas = new OffscreenCanvas(data.bitmap.width, data.bitmap.height);
    let ctx: OffscreenCanvasRenderingContext2D | null;
    if (ctx = canvas.getContext("2d")) {
        ctx.drawImage(data.bitmap, 0, data.partnumber * split, width, split, 0, 0, height, split);
        self.postMessage({ type: 'init', bitmap: data.bitmap }, [data.bitmap]);

        totalbuffer.set(ctx.getImageData(0, 0, width, split).data, buffersplit * data.partnumber);
        self.postMessage({ type: 'ready' });
    }
}