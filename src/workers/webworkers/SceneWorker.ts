let methods4: { [index: string]: (data: any) => void } = {
    createHeightMap: async (d: { id:number, buffer: Uint8ClampedArray, width: number, height: number }) => {
        try {
            let img = await fetch('/images/tenerife2.png');
            let b = await img.blob();

            let bitmap = await createImageBitmap(b);
            let totalbufferdata = new SharedArrayBuffer(bitmap.width * bitmap.height * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT);
            let partcount = 2;
            let readycount = 0;
            let workers = [];
            let width = bitmap.width;
            let height = bitmap.height;
            (function initWorker(bitmap) {
                let worker = new Worker('bitmapWorker.js');
                workers.push(worker);
                worker.postMessage({ bitmap: bitmap, buffer: totalbufferdata, partcount: partcount, partnumber: workers.length - 1 }, [bitmap]);

                worker.onmessage = e => {
                    if (e.data.type == 'init') {
                        if (workers.length < partcount) {
                            bitmap = e.data.bitmap;
                            initWorker(bitmap);
                        }
                    } else {
                        bitmap.close()
                        readycount++;
                        if (readycount == partcount) {
                            self.postMessage({ id: d.id, data: { buffer: totalbufferdata, width: width, height: height } });
                        }
                    }
                }
            })(bitmap);

            // for (let i = 0; i < partcount; i++) {
            //ctx.drawImage(bitmap, 0, i * split, bitmap.width, split, 0, 0, bitmap.height, split);
            //totalbuffer.set(ctx.getImageData(0, 0, bitmap.width, split).data, buffersplit * i);
            // }
            //this.postMessage({ id: d.id, data: { buffer: totalbufferdata, width: bitmap.width, height: bitmap.height }  });
        } catch (e) {
            if (e instanceof DOMException) {
                self.postMessage({ id: d.id, rejected: true, data: e.message });
            } else
                self.postMessage({ id: d.id, rejected: true, data: e });
        }
    }
}
onmessage = async (e: WorkerMessage) => {
    methods4[<string>e.data.action](e.data);
    }