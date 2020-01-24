onmessage = async (e) => {
    let width = e.data.bitmap.width;
    let height = e.data.bitmap.height;
    let split = (e.data.bitmap.height / e.data.partcount) | 0;
    let totalbuffer = new Uint8ClampedArray(e.data.buffer);
    let buffersplit = totalbuffer.length / e.data.partcount
    let canvas = new OffscreenCanvas(e.data.bitmap.width, e.data.bitmap.height);
    let ctx: OffscreenCanvasRenderingContext2D | null;
    if (ctx = canvas.getContext("2d")) {
        ctx.drawImage(e.data.bitmap, 0, e.data.partnumber * split, width, split, 0, 0, height, split);
        self.postMessage({ type: 'init', bitmap: e.data.bitmap }, [e.data.bitmap]);

        totalbuffer.set(ctx.getImageData(0, 0, width, split).data, buffersplit * e.data.partcount);
        self.postMessage({ type: 'ready' });
    }


}