onmessage = async (e) => {
    try {
        console.log('bitmapWorker');
        let data: { bitmap: ImageBitmap, buffer: SharedArrayBuffer, partcount: number, partnumber: number, align: number } = e.data;
        let width = data.bitmap.width;

        let split = (data.bitmap.height / data.partcount) | 0;
        let totalbuffer = new Uint8ClampedArray(data.buffer);
        console.log('bitmapWorker buffer inited');
        let totalWidth = 250;
        let buffersplit = split * totalWidth * 4;

        let canvas = new OffscreenCanvas(totalWidth, split);
        console.log('bitmapWorker offscreencanvas created');
        let ctx = canvas.getContext("2d")
        if (!ctx)
            throw ('Unable to get 2d context on bitmapworker ' + totalWidth + ' ' + split);

        console.log('bitmapWorker 2d contect created'); /* Stuck after this line */

        ctx.drawImage(data.bitmap, 0, split * data.partnumber  , width, split, data.align, 0, width, split);
        self.postMessage({ type: 'init', bitmap: data.bitmap }, [data.bitmap]);
        let imgdata = ctx.getImageData(0, 0, totalWidth, split).data;

        console.log('bitmapWorker getimagedata done');

        totalbuffer.set(imgdata, ((data.align * totalWidth * 4)) + buffersplit * data.partnumber);
        console.log('bitmapWorker buffer setted');
        self.postMessage({ type: 'ready' });
        self.close();
        
    } catch (e) {
        if (e instanceof DOMException)
            self.postMessage({ type: 'rejected', data: e.name + ': ' + e.message });
         else
            self.postMessage({ type: 'rejected', data: e });
    }
}