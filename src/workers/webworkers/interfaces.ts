enum WorkerReturn {
    noReturn,
    Promise
}
interface WMessage<T = Record<string, unknown>> {
    type: WorkerReturn,
    data: T,
    action: string,
    id: number
}
interface WorkerMessage<T = Record<string, unknown>> extends MessageEvent {
    data: WMessage<T>
}

interface WMessageObject<T, O> {
    action: keyof O,
    action2: O,
    data: T,
    id?: number
}
interface WorkerMessageObject<T, O> extends MessageEvent {
    data: WMessageObject<T, O | 'init'>
}