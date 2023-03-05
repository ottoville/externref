
const methods2: { [index: string]: (e: WMessage) => void } = {
    //@ts-ignore
    saveTexture: async (e: WMessage<{buffer:ArrayBuffer, size:[number, number]}>) => {
        const response = new Response(e.data.buffer);
        response.headers.set('Content-Length', e.data.buffer.byteLength.toString());
        response.headers.set('Content-Type', 'image/webp');
        (await caches.open('save')).put(new Request('/terrainTexture.webp'), response);

    },
}
onmessage = (e: WorkerMessage) => {
    methods2[e.data.action](e.data);
}