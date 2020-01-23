let methods4 = {
    createHeightMap: async (d) => {
        try {
            let img = await fetch('/images/tenerife2.png');
            let b = await img.blob();
           
            let bitmap = await createImageBitmap(b);
            let totalbufferdata = new SharedArrayBuffer(bitmap.width * bitmap.height * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT);
            let totalbuffer = new Uint8ClampedArray(totalbufferdata);
            let canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            let ctx = canvas.getContext("2d");
            let partcount = 2;
            let split = (bitmap.height / partcount) | 0;
            let buffersplit = totalbuffer.length / partcount
            for (let i = 0; i < partcount; i++) {
                ctx.drawImage(bitmap, 0, i * split, bitmap.width, split, 0, 0, bitmap.height, split);
                totalbuffer.set(ctx.getImageData(0, 0, bitmap.width, split).data, buffersplit * i);
                // console.log('subimage length: ',buffer.length)
                //canvas.transferControlToOffscreen();
            }
            this.postMessage({ id: d.id, data: { buffer: totalbufferdata, width: bitmap.width, height: bitmap.height }  });
        } catch (e) {
            this.postMessage({ id: d.id, rejected:true, data: e });
        }
    }
}
onmessage = async (e: WorkerMessage) => {
    methods4[e.data.action](e.data);
}