export enum WorkerReturn {
    noReturn,
    Promise
}
interface WMessage {
    type?: WorkerReturn,
    action: string,
    data: unknown,
    id?: number
}
const folderPosition = import.meta.url.lastIndexOf('/');
const basePath = import.meta.url.substring(0,
    folderPosition)+'/workers/webworkers/';
// Jest
const Worker2:typeof window.Worker = typeof(Worker) === 'function' ? Worker : class {} as unknown as typeof window.Worker;
abstract class MainWorker extends Worker2 {
    protected operations: ([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (value?: any | PromiseLike<unknown> | undefined) => void,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (value?: any | PromiseLike<unknown> | undefined) => void,
    ] | null)[] = [];
    #subscriptions: { [key: string]: (value?: unknown) => void; } = {
    };
    constructor(stringUrl: string | URL, options?: WorkerOptions) {
        super(basePath+stringUrl,
            options);
        this.onmessage = (e) => {
            if (typeof (e.data.id) !== 'undefined') {
                let operation: [
                    (value?: unknown | PromiseLike<unknown> | undefined) => void,
                    (value?: unknown | PromiseLike<unknown> | undefined) => void
                ] | null | undefined;
                if (operation = this.operations[e.data.id]) {
                    if (e.data.rejected)
                        operation[1](e.data.data);
                    else
                        operation[0](e.data.data);
                }
                this.operations[e.data.id] = null;
            } else {
                const func = this.#subscriptions[e.data.type];
                if (func)
                    func(e.data);
            }
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe(type: string, callback: (value?: any) => void) {
        this.#subscriptions[type] = callback;
    }
    unsubscribe(type: string) {
        delete this.#subscriptions[type];
    }
}
export class WorkerThread extends MainWorker {
    message<T>(returntype: WorkerReturn, action: string, data: object, options: Transferable[]): Promise<T> {
        const toWorker: WMessage = {
            action: action, data: data, type: returntype,
        };
        return new Promise((res, rej) => {
            toWorker.id = this.operations.push([
                res,
                rej
            ]) - 1;
            super.postMessage(toWorker,
                options);
        });
    }
}
export class ObjectWorkerThread extends MainWorker {
    signal(objectID: number, action: string, options: Transferable[], args?: unknown[]): void {
        super.postMessage({
            action: action,
            data: {
                args: typeof (args) !== 'undefined' ? args : [],
                objId: objectID,
            },
        },
        options);
    }
    message<T>(objectID: number, action: string, args?: unknown[], options?: Transferable[]): Promise<T> {
        const toWorker: WMessage = {
            action: action,
            data: {
                args: typeof(args)!=='undefined'?args:[],
                objId: objectID,
            },
        };
        return new Promise((res, rej) => {
            toWorker.id = this.operations.push([
                res,
                rej
            ]) - 1;
            if(options)
                super.postMessage(toWorker,
                    options);
            else
                super.postMessage(toWorker);
        });
    }
}