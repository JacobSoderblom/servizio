import { Observable } from 'rxjs';
import { Command, CommandFn, Event, EventFn, Message, Reply } from './message';

export enum TransportType {
  AMQP = 'AMQP',
}

export interface Transport<T extends TransportType = TransportType> {
  connect: () => Promise<TransportConnection<T>>;
  type: T;
}

export interface TransportConnection<
  Type extends TransportType = TransportType
> {
  type: Type;
  send: (cmd: Command) => Promise<Error | boolean | Message<Buffer>>;
  reply: (cmd: Reply) => Promise<Error | boolean>;
  publish: (event: Event) => Promise<Error | boolean>;
  subscribe: (event: EventFn) => Promise<Error | boolean>;
  handle: (cmd: CommandFn) => Promise<Error | boolean>;
  ack: (message: Message | undefined) => void;
  nack: (message: Message | undefined, resend?: boolean) => void;
  close: () => Promise<void>;
  message: Observable<Message<Buffer>>;
  status: Observable<string>;
  error: Observable<Error>;
}
