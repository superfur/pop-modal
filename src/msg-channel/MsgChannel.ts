import { Messages } from '../const/Message';

export interface ChannelOptions {
    prefix: string;
    target?: () => {
        window?: Window,
        origin?: string,
    };
    onMessage: (data: any) => void;
}

interface ObjectMessage {
    __prefix__: string;
    data: any;
}

export default class MsgChannel {
    private prefix: string;
    private options: ChannelOptions;

    constructor(options: ChannelOptions) {
        this.options = options;
        this.prefix = `__${options.prefix}__`;
    }

    public init() {
        window.addEventListener('message', this.onRawMessage, false);
    }

    public release() {
        window.removeEventListener('message', this.onRawMessage);
    }

    public sendMessage<T, P, K>(data: Messages<T, P, K>) {
        const rawData = this.toObjectMessage(data);

        const target = this.options.target ? this.options.target() : undefined;
        const targetWindow = ((target && target.window) || window) as Window;
        const targetOrigin = ((target && target.origin) || '*') as string;

        try {
            // Try send object message
            targetWindow.postMessage(rawData, targetOrigin);
            return true;
        } catch (e) {
            setTimeout(() => {
                throw e;
            });
            // Try send string message
            const stringData = this.toStringMessage(data);
            if (stringData) {
                try {
                    targetWindow.postMessage(stringData, targetOrigin);
                    return true;
                } catch (e) {
                    setTimeout(() => {
                        throw e;
                    });
                }
            }
        }
        return false;
    }

    private onRawMessage = (event: MessageEvent<any>): void => {
        if (!event.source || event.source === window) {
            return;
        }
        const rawData = event.data;
        const data = this.frRawMessage(rawData);
        if (data === undefined) {
            return;
        }

        this.options.onMessage(data);
    }

    private toObjectMessage(data: any): ObjectMessage {
        return {
            __prefix__: this.prefix,
            data,
        };
    }

    private toStringMessage(data: any): string {
        try {
            const rawData = JSON.stringify(data);

            return this.prefix + rawData;
        } catch (e) {
            return '';
        }
    }

    private frRawMessage(rawData: any): any {
        try {
            if (!rawData) {
                return;
            }
            const type = typeof rawData;
            if (type === 'object') {
                if (rawData.__prefix__ !== this.prefix) {
                    return;
                }

                return rawData.data;
            } else if (type === 'string') {
                if (!rawData.startsWith(this.prefix)) {
                    return;
                }

                rawData = rawData.substr(this.prefix.length);
                return rawData ? JSON.parse(rawData) : rawData;
            }
        } catch (e) {
            setTimeout(() => {
                throw e;
            });
        }
    }
}
