export enum WorkerReturn {
    noReturn,
    Promise
}
interface WMessage {
    type?: WorkerReturn,
    action: string,
    data: any,
    id?: number
}
interface WorkerMessage extends MessageEvent {
    data: WMessage
}
abstract class MainWorker extends Worker {
    protected operations: ([
        (value?: any | PromiseLike<any> | undefined) => void,
        (value?: unknown | PromiseLike<unknown> | undefined) => void,
    ] | null)[] = [];
    #subscriptions: { [key: string]: (value?: unknown) => void; } = {};
    constructor(stringUrl: any, options?: WorkerOptions) {
        super(stringUrl, options);
        this.onmessage = (e) => {
            if (typeof (e.data.id) !== 'undefined') {
                let operation: [
                    (value?: unknown | PromiseLike<unknown> | undefined) => void,
                    (value?: unknown | PromiseLike<unknown> | undefined) => void
                ] | null;
                if (operation = this.operations[e.data.id]) {
                    if (e.data.rejected)
                        operation[1](e.data.data);
                    else
                        operation[0](e.data.data);
                }
                this.operations[e.data.id] = null;
            } else if (typeof (this.#subscriptions[e.data.type]) !== 'undefined') {
                this.#subscriptions[e.data.type](e.data);
            }
        };
    }
    subscribe(type: string, callback: (value?: any) => void) {
        this.#subscriptions[type] = callback
    }
    unsubscribe(type: string) {
        delete this.#subscriptions[type];
    }
}
export class WorkerThread extends MainWorker {
    message<T, U>(returntype: WorkerReturn, action: string, data: object, options?: U): Promise<T> {
        let toWorker: WMessage = { type: returntype, action: action, data: data };
        return new Promise((res, rej) => {
            toWorker.id = this.operations.push([res,rej]) - 1
            super.postMessage(toWorker, options);
        })
    }
}
export class ObjectWorkerThread extends MainWorker {
    signal<U>(objectID: number, action: string, args?: any[], options?: U): void {
        super.postMessage({
            action: action, data: {
                objId: objectID,
                args: typeof (args) !== 'undefined' ? args : []
            }
        }, options);
    }
    message<T>(objectID: number, action: string, args?: any[]): Promise<T>
    message<T, U>(objectID: number, action: string, args?: any[], options?: U): Promise<T> {
        let toWorker: WMessage = {
            action: action, data: {
                objId: objectID,
                args: typeof(args)!=='undefined'?args:[]
            }
        };
        return new Promise((res, rej) => {
            toWorker.id = this.operations.push([res, rej]) - 1
            super.postMessage(toWorker, options);
        })
    }
}