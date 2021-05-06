import {
    CancelMessage,
    InitMessage,
    Messages,
} from '../const/Message';
import {
    CommonCallback,
    ConfigOptions,
    ContainerInfo,
    DEFAULT_CALLBACK,
    ELanguage,
    EMessage,
    EMessageCode,
    EStatus,
} from '../const/types';
import MsgChannel from '../msg-channel/MsgChannel';

const newError = (code: EMessageCode, message?: string) => {
    return {
        code,
        message,
    };
};

const DEFAULT_OPTIONS: Omit<ConfigOptions, 'url' | 'messageChannel'> = {
    lang: ELanguage.en_US,
    debounce: 3000,
    timeout: 10000,
};

export class PopModal {
    private options?: ConfigOptions;
    private status: EStatus = EStatus.NONE;
    private messageChannel?: MsgChannel;
    private container?: ContainerInfo;
    private time: number = 0;
    private loadTimer: any = 0;

    private paramContext?: {
        id: number;
        params: any;
        callback: CommonCallback<any>;
    };

    constructor(options: ConfigOptions) {
        if (this.options) {
            console.error('SDK has initialized!');
            return;
        }
        this.config(options);
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

    public open<T, K = any>(params: T, callback: CommonCallback<K> = DEFAULT_CALLBACK): boolean {
        if (!this.options) {
            console.error('SDK has not initialized!');
            return false;
        }
        const now = Date.now();
        if (now - this.time < this.options.debounce!) {
            this.log('Canceled by debounce limitation!');
            return false;
        }
        this.time = now;

        const oldContext = this.paramContext;
        if (oldContext) {
            oldContext.callback(newError(EMessageCode.CANCEL, 'Operation canceled'));
        }

        if (callback) {
            const oldCallback = callback;
            // Wrap the callback, avoid the exception rised by callback to interrupt sdk processing.
            callback = function(args: any) {
                try {
                    oldCallback.apply(null, args);
                } catch (e) {
                    console.error(e);
                }
            };
        }

        this.paramContext = {
            id: now,
            params,
            callback,
        };
        this.log('Open with context:');
        this.log(this.paramContext);

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
            console.error('Container has not initialized!');
            return;
        }
        this.stopLoadTimer();
        this.cancel();
        this.hideContainer();

        if (trigger && this.paramContext) {
            this.paramContext.callback(newError(EMessageCode.CANCEL, 'Operation canceled'));
        }

        if (this.options.alwaysNewContainer) {
            this.destroyContainer();
        }

        this.paramContext = undefined!;

        this.log('Close');
    }

    public getMsgChannel(): MsgChannel | undefined {
        return this.messageChannel;
    }

    private onMessage = (data: any) => {
        if (!this.paramContext) {
            return;
        }
        this.log('Receive message:');
        this.log(data);

        const type = data.type;
        switch (type) {
            case EMessage.CONTAINER_LOADED:
                this.onContainerLoaded();
                break;
            case EMessage.NORMAL:
            case EMessage.DONE:
            case EMessage.CANCEL:
            case EMessage.ERROR:
                this.onMessageCallback(data);
                break;
            default:
                break;
        }
    }

    private sendMessage(data: Messages) {
        this.log('Send message:');
        this.log(data);
        this.messageChannel?.sendMessage(data);
    }

    private initChannel() {
        this.messageChannel = new MsgChannel({
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
        if (this.status !== EStatus.LOADING || !this.container) {
            return;
        }
        this.container.element.style.top = '0';

        this.status = EStatus.LOADED;
        this.initData<T>();
    }

    private onContainerTimeout() {
        this.destroyContainer();
        const context = this.paramContext;
        if (context) {
            context.callback(newError(EMessageCode.ERROR, 'Replacer page loading timeout'));
        }
        this.paramContext = undefined!;

        this.log('Page container timeout!');

        setTimeout(() => {
            alert('Page loading failed');
        }, 100);
    }

    private onMessageCallback<T, K>(message: Messages<T, K>) {
        const callback = this.paramContext ? this.paramContext.callback : DEFAULT_CALLBACK;
        if (message.type === EMessage.DONE || message.type === EMessage.NORMAL) {
            callback(undefined, message.data);
            return;
        } else if (message.type === EMessage.CANCEL) {
            callback(newError(EMessageCode.CANCEL, 'Operation canceled'));
        } else if (message.type === EMessage.ERROR) {
            callback(newError(EMessageCode.ERROR, 'Replacer page returned error'));
        }

        this.hideContainer();
        this.paramContext = undefined!;
    }

    private initData<T>() {
        if (!this.paramContext) {
            return;
        }

        const data: any = {
            ...this.paramContext.params
        };

        this.sendMessage({
            type: EMessage.INIT,
            data,
        } as InitMessage<T>);
        this.log('Init data!');
    }

    private cancel() {
        if (!this.paramContext || this.status !== EStatus.LOADED) {
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

        console.log('%c [CONTAINER] ', 'color: red', message);
    }
}

export default PopModal;
