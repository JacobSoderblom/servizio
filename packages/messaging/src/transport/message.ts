export type EventType = 'Event' | 'Command' | 'Reply';

export interface MessageMetadata extends Record<string, unknown> {
  correlationId?: string;
  replyTo?: string;
  raw?: any;
}

export interface MessagePayload<
  P = unknown,
  E = any,
  T extends EventType = EventType
> {
  type: T;
  payload?: P;
  error?: E;
  metadata?: MessageMetadata;
}

export interface Message<T = MessagePayload> {
  queue: string;
  data: T;
  raw?: any;
  replyTo?: string;
  correlationId?: string;
  timeout?: number;
}

export type Command<P = unknown, E = unknown> = Message<
  MessagePayload<P, E, 'Command'>
>;
export type Event<P = unknown, E = unknown> = Message<
  MessagePayload<P, E, 'Event'>
>;
export type Reply<P = unknown, E = unknown> = Message<
  MessagePayload<P, E, 'Reply'>
>;

export interface CommandFn<P = any, E = Error> {
  (payload?: P, error?: E): Command<P, E>;
  queue: string;
}

export interface EventFn<P = any, E = Error> {
  (payload?: P, error?: E): Event<P, E>;
  queue: string;
}

export interface ReplyFn<P = any, E = Error> {
  (payload?: P, error?: E): Reply<P, E>;
  queue: string;
}

export const createCommand = <P, E = Error>(
  queue: string,
  replyTimeout?: number
): CommandFn<P, E> => {
  const fn: CommandFn<P, E> = (payload?: P, error?: E) => ({
    queue,
    data: {
      type: 'Command',
      payload,
      error,
    },
    timeout: replyTimeout,
  });

  fn.queue = queue;

  return fn;
};

export const createEvent = <P, E = Error>(queue: string): EventFn<P, E> => {
  const fn: EventFn<P, E> = (payload?: P, error?: E) => ({
    queue,
    data: {
      type: 'Event',
      payload,
      error,
    },
  });

  fn.queue = queue;

  return fn;
};

export const replyTo = <P, E = Error>(cmd: Message<unknown>): ReplyFn<P, E> => {
  const fn: ReplyFn<P, E> = (payload?: P, error?: E) => ({
    queue: cmd.replyTo as string,
    data: {
      type: 'Reply',
      payload,
      error,
    },
    correlationId: cmd.correlationId,
  });

  fn.queue = cmd.replyTo as string;

  return fn;
};
