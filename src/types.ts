
export enum EStatus {
    NONE = 0,
    LOADING,    // Loading page container
    LOADED,     // Page container has loaded
}

export interface ContainerInfo {
    styles: HTMLStyleElement;
    element: HTMLIFrameElement;
}

export enum ELanguage {
    zh_CN = 'zh_CN',
    en_US = 'en_US',
}

export interface ConfigOptions<T = any> {
    url: string;
    messageChannel: string;
    // bzType?: EBzType;     // default EBzType.COMMON
    debug?: boolean;    // Show debug info, default false
    debounce?: number;  // The debounce time for open operation, default 1000 ms
    timeout?: number;   // The timeout time for page container loading, default 10000 ms
    element?: HTMLElement;  // The wrapper dom element for page container, default body
    alwaysNewContainer?: boolean;    // Should always create a new page container, default false
    data?: T;
}

export enum EReplacerCode {
    NONE = 0,
    ERROR,
    CANCEL,
}

export interface ReplacerError {
    code: EReplacerCode;
    message?: string;
}

export enum EMessage {
    // 无
    NONE,
    // 容器加载
    CONTAINER_LOADED,
    // 初始化
    INIT,
    // 完成
    DONE,
    // 取消
    CANCEL,
    // 出错
    ERROR,
}
