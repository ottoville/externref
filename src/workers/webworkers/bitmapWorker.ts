onmessage = async (e) => {
    try {
        let data: { bitmap: ImageBitmap, buffer: SharedArrayBuffer, partcount: number, partnumber: number, align: number } = e.data;
        let width = data.bitmap.width;
        //let height = data.bitmap.height;
        let split = (data.bitmap.height / data.partcount) | 0;
        let totalbuffer = new Uint8ClampedArray(data.buffer);
        console.log('totalbuffer length', totalbuffer.length);
        let buffersplit = totalbuffer.length / data.partcount
        let canvas = new OffscreenCanvas(10000, split);
        let ctx: OffscreenCanvasRenderingContext2D | null;
        if (ctx = canvas.getContext("2d")) {
            ctx.drawImage(data.bitmap, 0, 0, width, split, data.align, 0, width, split);
            self.postMessage({ type: 'init', bitmap: data.bitmap }, [data.bitmap]);
            let imgdata = ctx.getImageData(0, 0, 10000, split).data;
            console.log('set data to buffer');
            console.log(data.align , 10000 , 4);
            console.log(((data.align * 10000 * 4)), buffersplit, data.partnumber);
            console.log('imgdata length ',imgdata.length)
            totalbuffer.set(imgdata, ((data.align * 10000 * 4)) + buffersplit * data.partnumber);
            self.postMessage({ type: 'ready' });
        }
    } catch (e) {
        if (e instanceof DOMException)
            self.postMessage({ type: 'rejected', data: e.name + ': ' + e.message });
         else
            self.postMessage({ type: 'rejected', data: e });
    }
}