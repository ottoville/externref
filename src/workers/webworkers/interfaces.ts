enum WorkerReturn {
    noReturn,
    Promise
}
interface WMessage<T> {
    type: WorkerReturn,
    data: T,
    action: string,
    id: number
}
interface WorkerMessage<T> extends MessageEvent {
    data: WMessage<T>
}

interface WMessageObject<T, O> {
    action: keyof O,
    data: T,
    id: number
}
interface WorkerMessageObject<T, O> extends MessageEvent {
    data: WMessageObject<T, O | 'init'>
}