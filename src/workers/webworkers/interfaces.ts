enum WorkerReturn {
    noReturn,
    Promise
}
interface WMessage<T> {
    type: WorkerReturn,
    action: string,
    data: T,
    id?: number
}
interface WorkerMessage<T> extends MessageEvent {
    data: WMessage<T>
}