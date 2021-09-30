import { Channel, ConsumeMessage, Options, Replies } from 'amqplib';
import { toError } from 'fp-ts/lib/Either';
import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { pipe, identity, flow } from 'fp-ts/lib/function';
import { first, lastValueFrom, Subject, from } from 'rxjs';
import { filter, take, mergeMap, mapTo } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { Message } from '../../transport/message';

const DEFAULT_TIMEOUT = 120 * 1000;

export const listen = (
  queue: string,
  messageSubject: Subject<ConsumeMessage>,
  options?: Options.AssertQueue
) =>
  flow(
    assertAndConsume(queue, (message) => messageSubject.next(message), options),
    TE.map(() => true),
    T.map(E.fold<Error, boolean, Error | boolean>(identity, identity))
  );

export const send =
  (options?: Options.AssertQueue) =>
  (queue: string, data: Buffer, reply?: { timeout?: number } | boolean) =>
  (channel: Channel, confirmChannel: Channel) =>
    pipe(
      O.fromNullable(reply),
      O.fold<
        { timeout?: number } | boolean,
        T.Task<boolean | Error | Message<Buffer>>
      >(
        () => () => assertAndSend(queue, data, options)(channel),
        (rep) => {
          const timeout =
            typeof rep === 'object' && rep !== null ? rep.timeout : undefined;

          return replySetup(queue, data, timeout)(channel, confirmChannel);
        }
      )
    );

export const sendWithoutAssert =
  (queue: string, data: Buffer, options: Options.Publish) =>
  (channel: Channel) =>
    channel.sendToQueue(queue, data, options);

const replySetup =
  (q: string, data: Buffer, timeout: number = DEFAULT_TIMEOUT) =>
  (sendChannel: Channel, confirmChannel: Channel) => {
    const replySubject = new Subject<string>();
    const resSubject = new Subject<ConsumeMessage>();
    const correlationId = uuid();

    let replyConsume: Replies.Consume;

    pipe(replySubject, first()).subscribe((replyTo) =>
      sendChannel.sendToQueue(q, data, {
        replyTo,
        correlationId,
      })
    );

    const removeReplyChannel = (consumerTag: string) => (channel: Channel) =>
      pipe(
        TE.tryCatch(() => channel.cancel(consumerTag), toError),
        T.map(E.fold((err) => resSubject.error(err), identity))
      );

    const replyChannelSetup = (channel: Channel) =>
      pipe(
        channel,
        assertAndConsume(
          `reply_${uuid()}`,
          (message) => resSubject.next(message),
          {
            exclusive: true,
            expires: timeout,
          },
          true
        ),
        TE.map(({ queue, consume }) => {
          replyConsume = consume;
          setTimeout(
            pipe(confirmChannel, removeReplyChannel(consume.consumerTag)),
            timeout
          );

          replySubject.next(queue.queue);
        })
      );

    const getLastValue = () =>
      lastValueFrom(
        pipe(
          resSubject.asObservable(),
          filter((raw) => raw.properties.correlationId === correlationId),
          take(1),
          mergeMap((raw) =>
            pipe(
              from(
                removeReplyChannel(replyConsume.consumerTag)(confirmChannel)()
              ),
              mapTo({
                data: raw.content,
                replyTo: raw.properties.replyTo,
                correlationId: raw.properties.correlationId,
                raw,
              } as Message<Buffer>)
            )
          )
        )
      );

    return pipe(
      confirmChannel,
      replyChannelSetup,
      T.chain(() => getLastValue)
    );
  };

const assertAndConsume =
  (
    queue: string,
    onMessage: (message: ConsumeMessage) => void,
    options?: Options.AssertQueue,
    noAck = false
  ) =>
  (channel: Channel) =>
    pipe(
      TE.tryCatch(
        () =>
          Promise.all([
            channel.assertQueue(queue, options),
            channel.consume(queue, (message) => message && onMessage(message), {
              noAck,
            }),
          ]),
        toError
      ),
      TE.map(([q, c]) => ({ queue: q, consume: c }))
    );

const assertAndSend =
  (queue: string, data: Buffer, options?: Options.AssertQueue) =>
  (channel: Channel) =>
    pipe(
      TE.tryCatch(
        () =>
          Promise.all([
            channel.assertQueue(queue, options),
            channel.sendToQueue(queue, data),
          ]),
        toError
      ),
      T.map(
        flow(
          E.map(([, res]) => res),
          E.fold<Error, boolean, Error | boolean>(identity, identity)
        )
      )
    )();
