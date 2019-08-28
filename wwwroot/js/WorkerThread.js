export var WorkerReturn;
(function (WorkerReturn) {
    WorkerReturn[WorkerReturn["noReturn"] = 0] = "noReturn";
    WorkerReturn[WorkerReturn["Promise"] = 1] = "Promise";
})(WorkerReturn || (WorkerReturn = {}));
export class WorkerThread extends Worker {
    constructor(stringUrl, options) {
        super(stringUrl, options);
        this.operations = [];
        this.subscriptions = {};
        this.onmessage = (e) => {
            if (typeof (e.data.id) !== 'undefined') {
                this.operations[e.data.id](e.data.data);
                this.operations[e.data.id] = null;
            }
            else if (typeof (this.subscriptions[e.data.type]) !== 'undefined') {
                this.subscriptions[e.data.type](e.data);
            }
        };
    }
    message(returntype, action, data, options) {
        let toWorker = { type: returntype, action: action, data: data };
        return new Promise((res, rej) => {
            toWorker.id = this.operations.push(res) - 1;
            super.postMessage(toWorker, options);
        });
    }
    subscribe(type, callback) {
        this.subscriptions[type] = callback;
    }
}
