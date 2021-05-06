import { EMessage } from './types';

export type Messages<T = any, K = any, P = any, M = any> = ContainterLoadedMessage | InitMessage<T> | NormalMessage<P> | DoneMessage<K> | CancelMessage | ErrorMessage<M>;

export interface BaseMessage {
    type: EMessage;
}

export interface ContainterLoadedMessage extends BaseMessage {
    type: EMessage.CONTAINER_LOADED;
}

export interface InitMessage<T> extends BaseMessage {
    type: EMessage.INIT;
    data: T;
}

export interface NormalMessage<T> extends BaseMessage {
    type: EMessage.NORMAL;
    data: T;
}

export interface DoneMessage<T> extends BaseMessage {
    type: EMessage.DONE;
    data: T;
}

export interface CancelMessage extends BaseMessage {
    type: EMessage.CANCEL;
}

export interface ErrorMessage<T> extends BaseMessage {
    type: EMessage.ERROR;
    data: T;
}
