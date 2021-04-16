import { EMessage } from './types';

export type Messages<T, K, P = any> = ContainterLoadedMessage | InitMessage<T> | DoneMessage<K> | CancelMessage | ErrorMessage<P>;

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
