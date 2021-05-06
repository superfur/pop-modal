# PopModal

## 介绍
PopModal是一个基于iframe的通信框架，封装了加载iframe期间的生命周期。

## 组件生命周期
1. 容器加载完成 EMessage.CONTAINER_LOADED
2. 页面初始化 EMessage.INIT
3. 完成 EMessage.DONE
4. 取消 EMessage.CANCEL
5. 错误 EMessage.ERROR

## 流程
1. 外部应用new一个PopModal实例，挂载container相关的options，并通过open方法传入data及callback。
2. PopModal创建container并append到body（或页面指定节点)，container页面初始化MessageChannel之后发送 EMessage.CONTAINER_LOADED 至PopModal。
3. PopModal调用发送页面初始化的 EMessage.INIT 事件及初始化数据至container页面，container页面接收数据并进行初始化。
4. 初始化之后，PopModal接收 EMessage.DONE、EMessage.CANCEL、EMessage.ERROR 的事件。

## 用法
```typescript
// 外部组件
import { PopModal } from '@qunhe/pop-modal';

const modal = new PopModal({
    url: '/xx/xxx/xxx',
    messageChannel: 'FOO_BAR',
})

modal.open<{url: string}, string>({ url }, (err: any, src: string) => void);
modal.release();

```

```typescript
// 内部组件、页面
const channel = new MessageChannel({
    target: () => ({ window: window.parent || window }),
    prefix: 'FOO_BAR',
    onMessage: onMessage,
});
channel.init();
channel.sendMessage({
    type: EMessage.CONTAINER_LOADED,
});

function onMessage(data: Messages<{ url }, string, any>) {
    if (data.type === EMessage.INIT) {
        // do sth
    } else if (data.type === EMessage.CANCEL) {
        // do sth
    }
}
```

## API
### PopModal
```typescript
export interface ConfigOptions<T = any> {
    url: string;
    messageChannel: string;
    debug?: boolean;
    debounce?: number;
    timeout?: number;
    element?: HTMLElement;
    alwaysNewContainer?: boolean;
    data?: T;
}
```
#### open
```typescript
popModal.open<T, P>(params: T, callback: OpenCallback<P>);
```
> 定义一个初始化入参类型及页面返回done的返回值类型

#### release
```typescript
popModal.release();
```
> 从外部销毁、而非隐藏

#### config
> 同new方法

### MessageChannel
```typescript
export interface ChannelOptions {
    prefix: string;
    target?: () => {
        window?: Window,
        origin?: string,
    };
    onMessage: (data: any) => void;
}
```

#### init
> 监听prefix频道的消息

#### release
> 停止监听prefix频道的消息

#### sendMessage
> 需要类型是Messages的消息

#### getMsgChannel
> 获取父组件的MessageChannel

### Messages
```typescript
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
```