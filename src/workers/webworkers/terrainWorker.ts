
const methods2: { [index: string]: (e: WMessage) => void } = {

    saveTexture: async (e: WMessage<{buffer:ArrayBuffer, size:[number, number]}>) => {
        const response = new Response(e.data.buffer);
        response.headers.set('content-length', e.data.buffer.byteLength.toString());
        (await caches.open('save')).put(new Request('/terrainTexture.webp'), response);

    },
}
onmessage = (e: WorkerMessage) => {
    methods2[e.data.action](e.data);
}