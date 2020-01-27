export enum WorkerReturn {
    noReturn,
    Promise
}
interface WMessage {
    type: WorkerReturn,
    action: string,
    data: any,
    id?: number
}
interface WorkerMessage extends MessageEvent {
    data: WMessage
}
export class WorkerThread extends Worker {
    private operations: ([
         (value?: unknown) => void,
         (value?: unknown) => void 
    ]|null)[] = [];
    private subscriptions: { [key: string]: (value?: unknown) => void; } = {};
    constructor(stringUrl: any, options?: WorkerOptions) {
        super(stringUrl, options);
        this.onmessage = (e) => {
            if (typeof (e.data.id) !== 'undefined') {
                let operation: [
                    (value?: unknown) => void,
                    (value?: unknown) => void
                ] | null;
                if (operation = this.operations[e.data.id]) {
                    if (e.data.rejected)
                        operation[1](e.data.data);
                    else
                        operation[0](e.data.data);
                }
                this.operations[e.data.id] = null;
            } else if (typeof (this.subscriptions[e.data.type]) !== 'undefined') {
                this.subscriptions[e.data.type](e.data);
            }
        };
    }
    message<T, U>(returntype: WorkerReturn, action: string, data: object, options?: U): Promise<T> {
        let toWorker: WMessage = { type: returntype, action: action, data: data };
        return new Promise((res, rej) => {
            toWorker.id = this.operations.push([res,rej]) - 1
            super.postMessage(toWorker, options);
        })
    }
    subscribe(type: string, callback: (value?: any) => void) {
        this.subscriptions[type] = callback
    }
    unsubscribe(type: string) {
        delete this.subscriptions[type];
    }
}