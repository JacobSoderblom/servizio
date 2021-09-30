import { ConsumeMessage, Options, Connection, Channel } from 'amqplib';
import { identity, pipe } from 'fp-ts/lib/function';
import * as E from 'fp-ts/lib/Either';
import * as T from 'fp-ts/lib/Task';
import {
  fromEvent,
  map,
  mapTo,
  merge,
  Observable,
  share,
  Subject,
  tap,
} from 'rxjs';

import { jsonTransformer } from '../../transport/transform';
import {
  Command,
  CommandFn,
  Event,
  EventFn,
  Message,
  Reply,
} from '../../transport/message';
import { TransportConnection, TransportType } from '../../transport/transport';
import * as Q from './queue';
import * as EX from './exchange';

export enum AmqpConnectionStatus {
  CONNECTED = 'CONNECTED',
  CHANNEL_CONNECTED = 'CHANNEL_CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  CHANNEL_DISCONNECTED = 'CHANNEL_DISCONNECTED',
}

export class AmqpConnection implements TransportConnection<TransportType.AMQP> {
  private statusSubject = new Subject<AmqpConnectionStatus>();
  private messageSubject = new Subject<ConsumeMessage>();
  private errorSubject = new Subject<Error>();
  private closeSubject = new Subject();

  constructor(
    private connection: Connection,
    private listenChannel: Channel,
    private sendChannel: Channel,
    private confirmChannel: Channel,
    private options: {
      queueSuffix: string;
      exchangeOptions: Options.AssertExchange;
      queueOptions: Options.AssertQueue;
      noAck?: boolean;
    }
  ) {}

  get type() {
    return TransportType.AMQP;
  }

  get error() {
    return merge(
      fromEvent(this.connection, 'error') as Observable<Error>,
      this.errorSubject.asObservable()
    );
  }

  get status() {
    const connect = pipe(
      fromEvent(this.connection, 'connect'),
      mapTo(AmqpConnectionStatus.CONNECTED)
    );

    const disconnect = pipe(
      fromEvent(this.connection, 'disconnect') as Observable<{ err?: Error }>,
      tap(({ err }) => err && this.errorSubject.next(err)),
      mapTo(AmqpConnectionStatus.DISCONNECTED)
    );

    return merge(connect, disconnect, this.statusSubject.asObservable());
  }

  get message() {
    return pipe(
      this.messageSubject.asObservable(),
      share(),
      map(
        (raw) =>
          ({
            queue: '',
            data: raw.content,
            replyTo: raw.properties.replyTo,
            correlationId: raw.properties.correlationId,
            raw,
          } as Message<Buffer>)
      )
    );
  }

  subscribe = (message: EventFn) =>
    pipe(
      this.listenChannel,
      EX.subscribe(
        this.messageSubject,
        this.options.exchangeOptions,
        this.options.queueOptions
      )(message.queue, `${message.queue}_${this.options.queueSuffix}`)
    )();

  publish = (message: Event) =>
    pipe(
      jsonTransformer.encode(message.data),
      (v) => (v instanceof Error ? E.left(v as Error) : E.right(v)),
      E.fold<Error, Buffer, Promise<boolean | Error>>(
        (err) => Promise.reject(err),
        (msg) => pipe(this.sendChannel, EX.send({})(message.queue, msg))()
      )
    );

  handle = (message: CommandFn) =>
    pipe(
      this.listenChannel,
      Q.listen(message.queue, this.messageSubject, this.options.queueOptions)
    )();

  send = (message: Command, reply?: boolean) =>
    pipe(
      jsonTransformer.encode(message.data),
      (v) => (v instanceof Error ? E.left(v as Error) : E.right(v)),
      E.fold<Error, Buffer, Promise<boolean | Message<Buffer> | Error>>(
        (err) => Promise.reject(err),
        (msg) =>
          Q.send({})(message.queue, msg, reply && { timeout: message.timeout })(
            this.sendChannel,
            this.confirmChannel
          )()
      )
    );

  reply = (message: Reply) =>
    Promise.resolve(
      pipe(
        jsonTransformer.encode(message.data),
        (v) => (v instanceof Error ? E.left(v as Error) : E.right(v)),
        E.fold<Error, Buffer, boolean | Error>(identity, (msg) =>
          Q.sendWithoutAssert(message.queue, msg, {
            correlationId: message.correlationId,
          })(this.sendChannel)
        )
      )
    );

  ack = <T>(message?: Message<T>) => {
    if (this.options.noAck || !message || message.raw.iAcked) {
      return message;
    }

    this.listenChannel.ack(message.raw);
    message.raw.isAcked = true;

    return message;
  };

  nack = <T>(message?: Message<T>, resend = true) => {
    if (this.options.noAck || !message || message.raw.isNacked) {
      return message;
    }

    this.listenChannel.nack(message.raw, false, resend);
    message.raw.isNacked = true;

    return message;
  };

  close = async () => {
    await this.sendChannel.close();
    await this.listenChannel.close();
    await this.confirmChannel.close();
    await this.connection.close();
    this.closeSubject.next(null);
  };
}
