export type CommonCallback<T> = (error?: MessageError, data?: T) => void;

export const DEFAULT_CALLBACK: CommonCallback<any> = (error?: MessageError) => {
    console.log(error);
};

export interface ConfigOptions {
    /**
     * Container Url.
     */
    url: string;
    /**
     * Message channel name.
     */
    messageChannel: string;
    /**
     * language, default en_US
     */
    lang?: ELanguage;
    /**
     * Show debug info, default false.
     */
    debug?: boolean;
    /**
     * Debounced when open, default 1000.
     */
    debounce?: number;
    /**
     * The timeout time for page container loading, default 10000.
     */
    timeout?: number;
    /**
     * The wrapper dom element for page container, default body.
     */
    element?: HTMLElement;
    /**
     * Should always create a new page container, default false.
     */
    alwaysNewContainer?: boolean;    // Should always create a new page container, default false
}

export interface ClientConfigOptions<T = any> {
    /**
     * Message channel name.
     */
    messageChannel: string;
    /**
     * Show debug info, default false.
     */
    debug?: boolean;
    /**
     * Callback when sendMessage
     */
    callback: CommonCallback<T>;
}

export enum EStatus {
    /**
     * No Container alive
     */
    NONE = 0,
    /**
     * Loading the Container
     */
    LOADING,
    /**
     * The container loaded
     */
    LOADED,
}

export interface ContainerInfo {
    styles: HTMLStyleElement;
    element: HTMLIFrameElement;
}

export enum ELanguage {
    zh_CN = 'zh_CN',
    en_US = 'en_US',
}

export enum EMessageCode {
    NONE = 0,
    ERROR,
    CANCEL,
}

export interface MessageError {
    code: EMessageCode;
    message?: string;
}

export enum EMessage {
    /**
     * When container loaded, container send message to father.
     */
    CONTAINER_LOADED,
    /**
     * When container loaded, father send init data to container.
     */
    INIT,
    /**
     * Normal one-way message.
     */
    NORMAL,
    /**
     * Done with data.
     */
    DONE,
    /**
     * Done without data.
     */
    CANCEL,
    /**
     * Error
     */
    ERROR,
}
