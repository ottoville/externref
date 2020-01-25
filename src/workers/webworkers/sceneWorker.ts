let methods4: { [index: string]: (data: any) => void } = {
    createHeightMap: async (d: { id:number, buffer: Uint8ClampedArray, width: number, height: number }) => {
        try {
            let img = await fetch('/images/tenerife3.webp');
            let b = await img.blob();

            let bitmap = await createImageBitmap(b);

            /* ReferenceError: SharedArrayBuffer is not defined */
            let totalbufferdata = new SharedArrayBuffer(10000 * 10000 * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT);

            let align = (10000 - bitmap.width) / 2

            let partcount = 4;
            let readycount = 0;
            let workers:Worker[] = [];

            (function initWorker(bitmap) {
                let worker = new Worker('bitmapWorker.js');
                workers.push(worker);
                worker.postMessage({ bitmap: bitmap, buffer: totalbufferdata, partcount: partcount, partnumber: workers.length - 1, align:align }, [bitmap]);
                worker.onmessage = e => {
                    try {
                        if (e.data.type == 'init') {
                            if (workers.length < partcount) {
                                bitmap = e.data.bitmap;
                                initWorker(bitmap);
                            } else
                                bitmap.close()
                        } else if (e.data.type == 'ready') {
                            if (++readycount == partcount) {
                                self.postMessage({ id: d.id, data: { buffer: totalbufferdata, width: 10000, height: 10000 } });
                                workers.forEach(w => w.terminate())
                            }
                        } else if (e.data.type == 'rejected') {
                            throw (e.data.data);
                        }
                    } catch (e) {
                        if (e instanceof DOMException) {
                            self.postMessage({ id: d.id, rejected: true, data: e.message });
                        } else
                            self.postMessage({ id: d.id, rejected: true, data: e });
                    }
                }
            })(bitmap);
        } catch (e) {
            if (e instanceof DOMException) {
                self.postMessage({ id: d.id, rejected: true, data: e.name + ': '+ e.message});
            } else
                self.postMessage({ id: d.id, rejected: true, data: e });
        }
    }
}
onmessage = async (e: WorkerMessage) => {
    methods4[<string>e.data.action](e.data);
    }