/* Progress 40-50 are reserved for this worker */
let methods4: { [index: string]: (data: any) => void } = {
    createHeightMap: async (d: { id: number }) => {
        try {
            let img = await fetch('/images/tenerife3_75.webp');
            let b = await img.blob();

            let bitmap = await createImageBitmap(b);

            /* RangeError: Array buffer allocation failed */
            //let totalbufferdata = new SharedArrayBuffer(10000 * 10000 * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT);
            let totalbufferdata = new SharedArrayBuffer(250 * 250 * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT);

            let align = (250 - bitmap.width) / 2

            let partcount = 2;
            let readycount = 0;
            let workers: Worker[] = [];
            self.postMessage({ type: 'setProgress',  data: {progress: 41} });
            (function initWorker(bitmap) {
                let worker = new Worker('bitmapWorker.js');
                workers.push(worker);
            /* progress 42 and 43 are reserved for this */
                console.log('spawning bitmap thread');
                self.postMessage({ type: 'setProgress', data: { progress: 41 + (2 * (workers.length / partcount)) } });
                console.log('bitmap thread spawned');
                worker.postMessage({ bitmap: bitmap, buffer: totalbufferdata, partcount: partcount, partnumber: workers.length - 1, align: align }, [bitmap]);
                worker.onmessage = e => {
                    try {
                        if (e.data.type == 'init') {
                            if (workers.length < partcount) {
                                bitmap = e.data.bitmap;
                                initWorker(bitmap);
                            } else {
                                self.postMessage({ type: 'setProgress', data: { progress: 45 } });
                                bitmap.close();
                                self.postMessage({ type: 'setProgress',  data: { progress: 46 } });
                            }
                        } else if (e.data.type == 'ready') {
                            if (++readycount == partcount) {
                                self.postMessage({ type: 'setProgress', data: { progress: 48 } });
                                self.postMessage({
                                    id: d.id, data: VERTEX_CreateGroundFromHeightMap({
                                        width: 10000, height: 10000,
                                        subdivisions: 250,
                                        minHeight: -2, maxHeight: 250, colorFilter: [0.3, 0.59, 0.11],
                                        buffer: new Uint8ClampedArray(totalbufferdata), bufferWidth: 250, bufferHeight: 250,
                                        alphaFilter: 0.0
                                    })
                                });
                                workers.forEach(w => w.terminate());
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
                self.postMessage({ id: d.id, rejected: true, data: e.name + ': ' + e.message });
            } else
                self.postMessage({ id: d.id, rejected: true, data: e });
        }
    }
}
onmessage = async (e: WorkerMessage<any>) => {
    methods4[<string>e.data.action](e.data);
}