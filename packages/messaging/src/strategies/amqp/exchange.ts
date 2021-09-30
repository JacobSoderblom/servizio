import { Channel, ConsumeMessage, Options } from 'amqplib';
import { toError } from 'fp-ts/lib/Either';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/lib/Task';
import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';
import { Subject } from 'rxjs';

export const subscribe =
  (
    messageSubject: Subject<ConsumeMessage>,
    options?: Options.AssertExchange,
    subQueueOptions?: Options.AssertQueue,
    type = 'topic'
  ) =>
  (queue: string, subQueue: string) =>
  (channel: Channel) =>
    pipe(
      TE.tryCatch(
        () =>
          assertBindAndConsume(
            queue,
            subQueue,
            type,
            (message) => messageSubject.next(message),
            options,
            subQueueOptions
          )(channel),
        toError
      ),
      T.map(
        flow(
          E.map(() => true),
          E.fold<Error, boolean, Error | boolean>(identity, identity)
        )
      )
    );
export const send =
  (options?: Options.AssertExchange, type = 'topic') =>
  (queue: string, data: Buffer) =>
  (channel: Channel) =>
    pipe(
      TE.tryCatch(
        () => assertAndSend(queue, data, type, options)(channel),
        toError
      ),
      T.map(
        flow(
          E.map(([, res]) => res),
          E.fold<Error, boolean, Error | boolean>(identity, identity)
        )
      )
    );

const assertAndSend =
  (
    queue: string,
    data: Buffer,
    type: string,
    options?: Options.AssertExchange
  ) =>
  (channel: Channel) =>
    Promise.all([
      assertExchange(queue, type, options)(channel),
      channel.publish(queue, '#', data),
    ]);

const assertExchange =
  (queue: string, type: string, options?: Options.AssertExchange) =>
  (channel: Channel) =>
    channel.assertExchange(queue, type, options);

const assertBindAndConsume =
  (
    queue: string,
    subQueue: string,
    type: string,
    onMessage: (message: ConsumeMessage) => void,
    options?: Options.AssertExchange,
    subQueueOptions?: Options.AssertQueue
  ) =>
  (channel: Channel) =>
    Promise.all([
      assertExchange(queue, type, options)(channel),
      channel.assertQueue(subQueue, subQueueOptions),
      channel.bindQueue(subQueue, queue, '#'),
      channel.consume(subQueue, (message) => message && onMessage(message)),
    ]);
