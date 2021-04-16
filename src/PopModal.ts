import {
    CancelMessage,
    InitMessage,
    Messages,
} from './Message';
import MessageChannel from './MessageChannel';
import {
    ConfigOptions,
    ContainerInfo,
    EMessage,
    EReplacerCode,
    EStatus,
    ReplacerError,
} from './types';

const newError = (code: EReplacerCode, message?: string) => {
    return {
        code,
        message,
    };
};

const DEFAULT_OPTIONS: Omit<ConfigOptions, 'url' | 'messageChannel'> = {
    debounce: 3000,
    timeout: 10000,
};

export type OpenCallback<T> = (error?: ReplacerError, data?: T) => void;

const DEFAULT_CALLBACK: OpenCallback<any> = (error: ReplacerError, data?: any) => {
    // tslint:disable-next-line
    console.log(error || data);
};

export class PopModal {
    private options?: ConfigOptions;
    private status: EStatus;
    private messageChannel?: MessageChannel;
    private container: ContainerInfo;
    private time: number;
    private loadTimer: any;

    private editContext: {
        id: number;
        params: any;
        callback: OpenCallback<any>;
    };

    constructor(options: ConfigOptions) {
        if (this.options) {
            // tslint:disable-next-line
            console.error('SDK has initialized!');
            return;
        }
        this.config(options || {});
        this.status = EStatus.NONE;
        this.time = 0;
        this.loadTimer = 0;
        this.initChannel();

        this.log('SDK initialized!');
    }

    public release() {
        if (!this.options) {
            return;
        }
        this.close();
        this.destroyContainer();
        this.releaseChannel();
        delete this.options;

        this.log('SDK released!');
    }

    public config(options: ConfigOptions) {
        this.options = Object.assign({}, this.options || DEFAULT_OPTIONS, options);

        this.log('New config:');
        this.log(this.options);
    }

    public open<T, P = any>(params: T, callback: OpenCallback<P>): boolean {
        if (!this.options) {
            // tslint:disable-next-line
            console.error('SDK has not initialized!');
            return false;
        }
        const now = Date.now();
        if (now - this.time < this.options.debounce!) {
            this.log('Canceled by debounce limitation!');
            return false;
        }
        this.time = now;

        const oldContext = this.editContext;
        if (oldContext) {
            oldContext.callback(newError(EReplacerCode.CANCEL, 'Operation canceled'));
        }

        if (callback) {
            const oldCallback = callback;
            // Wrap the callback, avoid the exception rised by callback to interrupt sdk processing.
            callback = function() {
                try {
                    oldCallback.apply(this, arguments);
                } catch (e) {
                    // tslint:disable-next-line
                    console.error(e);
                }
            };
        }

        callback = callback || DEFAULT_CALLBACK;
        this.editContext = {
            id: now,
            params,
            callback,
        };
        this.log('Open with context:');
        this.log(this.editContext);

        if (this.options.alwaysNewContainer) {
            this.destroyContainer();
        }

        this.createContainer();
        this.showContainer();

        if (this.status === EStatus.LOADED) {
            this.initData<T>();
        }

        return true;
    }

    public close(trigger: boolean = true) {
        if (!this.options) {
            // tslint:disable-next-line
            console.error('Container has not initialized!');
            return;
        }
        this.stopLoadTimer();
        this.cancel();
        this.hideContainer();

        if (trigger && this.editContext) {
            this.editContext.callback(newError(EReplacerCode.CANCEL, 'Operation canceled'));
        }

        if (this.options.alwaysNewContainer) {
            this.destroyContainer();
        }

        this.editContext = undefined!;

        this.log('Close');
    }

    private onMessage = (data: any) => {
        if (!this.editContext) {
            return;
        }
        this.log('Receive message:');
        this.log(data);

        const type = data.type;
        switch (type) {
            case EMessage.CONTAINER_LOADED:
                this.onContainerLoaded();
                break;
            case EMessage.DONE:
            case EMessage.CANCEL:
            case EMessage.ERROR:
                this.onMessageCallback(data);
                break;
            default:
                break;
        }
    }

    private sendMessage<T, P, K>(data: Messages<T, P, K>) {
        this.log('Send message:');
        this.log(data);
        this.messageChannel?.sendMessage(data);
    }

    private initChannel() {
        this.messageChannel = new MessageChannel({
            prefix: this.options?.messageChannel || '',
            onMessage: this.onMessage,
            target: () => {
                let targetWindow: Window = undefined!;
                if (this.container) {
                    targetWindow = this.container.element.contentWindow!;
                }

                return {
                    window: targetWindow,
                };
            }
        });

        this.messageChannel.init();

        this.log('Message channel initialized!');
    }

    private releaseChannel() {
        this.messageChannel?.release();
        delete this.messageChannel;

        this.log('Message channel released!');
    }

    private createContainer() {
        if (this.container) {
            return;
        }

        // The contaier is placed in a non-visible position at first,
        // When container is loaded, will be placed in the right position.
        const styles: HTMLStyleElement = document.createElement('style');
        styles.innerHTML = [
            '#__Container {',
            '   position: fixed;',
            '   left: 0;',
            '   top: -100000px;',
            '   width: 100%;',
            '   height: 100%;',
            '   border: none;',
            '   margin: 0;',
            '   padding: 0;',
            '   z-index: 999999999;',
            '   background: transparent;',
            '}',
        ].join('\n');
        const element: HTMLIFrameElement = document.createElement('iframe');
        element.src = this.options?.url || '';
        element.id = '__Container';
        const container = {
            styles,
            element,
        };

        const containerElement = this.options?.element || document.body;
        document.head.appendChild(styles);
        containerElement.appendChild(element);

        this.container = container;
        this.status = EStatus.LOADING;

        this.startLoadTimer();

        this.log('Create page container!');
    }

    private destroyContainer() {
        if (!this.container) {
            return;
        }

        this.stopLoadTimer();
        const container = this.container;
        this.container = undefined!;
        container.element.remove();
        container.styles.remove();

        this.status = EStatus.NONE;

        this.log('Destroy page container!');
    }

    private hideContainer() {
        if (!this.container) {
            return;
        }

        this.container.element.style.display = 'none';

        this.log('Hide page container!');
    }

    private showContainer() {
        if (!this.container) {
            return;
        }

        this.container.element.style.display = 'block';

        this.log('Show page container!');
    }

    private onContainerLoaded<T>() {
        this.stopLoadTimer();
        if (this.status !== EStatus.LOADING) {
            return;
        }
        // Place container to the right position
        this.container.element.style.top = '0';

        this.status = EStatus.LOADED;
        this.initData<T>();
    }

    private onContainerTimeout() {
        this.destroyContainer();
        const context = this.editContext;
        if (context) {
            context.callback(newError(EReplacerCode.ERROR, 'Replacer page loading timeout'));
        }
        this.editContext = undefined!;

        this.log('Page container timeout!');

        setTimeout(() => {
            alert('Page loading failed');
        }, 100);
    }

    private onMessageCallback<T, K, P>(data: Messages<T, K, P>) {
        const callback = this.editContext ? this.editContext.callback : DEFAULT_CALLBACK;
        if (data.type === EMessage.DONE) {
            callback(undefined, data.data);
        } else if (data.type === EMessage.CANCEL) {
            callback(newError(EReplacerCode.CANCEL, 'Operation canceled'));
        } else if (data.type === EMessage.ERROR) {
            callback(newError(EReplacerCode.ERROR, 'Replacer page returned error'));
        }

        this.hideContainer();
        this.editContext = undefined!;
    }

    private initData<T>() {
        if (!this.editContext) {
            return;
        }

        const data: any = {
            ...this.editContext.params
        };

        this.sendMessage({
            type: EMessage.INIT,
            data,
        } as InitMessage<T>);
        this.log('Init data!');
    }

    private cancel() {
        if (!this.editContext || this.status !== EStatus.LOADED) {
            return;
        }
        this.sendMessage({
            type: EMessage.CANCEL,
        } as CancelMessage);
        this.log('Cancel!');
    }

    private startLoadTimer() {
        this.stopLoadTimer();

        this.loadTimer = setTimeout(() => {
            this.loadTimer = 0;
            this.onContainerTimeout();
        }, this.options?.timeout);
    }

    private stopLoadTimer() {
        if (!this.loadTimer) {
            return;
        }

        clearTimeout(this.loadTimer);
        this.loadTimer = 0;
    }

    private log(message: any) {
        if (!this.options?.debug) {
            return;
        }

        // tslint:disable-next-line
        console.log('[CONTAINER] ', message);
    }
}

export default PopModal;
