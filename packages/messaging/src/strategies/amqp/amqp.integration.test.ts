import { pipe } from 'rxjs';
import { jsonTransformer } from '../../transport/transform';
import {
  createCommand,
  createEvent,
  replyTo,
  Message,
  MessagePayload,
} from '../../transport/message';
import { TransportType } from '../../transport/transport';
import { AmqpStrategy } from './amqp';

describe('Amqp', () => {
  test('send and recieve command', async () => {
    const amqp = new AmqpStrategy({
      host: '127.0.0.1',
      port: 5672,
      user: 'guest',
      password: 'guest',
      app: 'test',
    });

    const connection = await amqp.connect();

    const waitOn = wait((resolve) => {
      connection.message.subscribe({
        next: pipe(
          (v) => connection.ack(v),
          (v) => v as Message<Buffer>,
          (v) => jsonTransformer.decode(v.data) as MessagePayload<string>,
          (data) => {
            expect(data.payload).toEqual('hello');
            expect(data.type).toEqual('Command');
            resolve(undefined);
          }
        ),
      });
    });

    const cmd = createCommand<string>('test.test');

    await connection.handle(cmd);

    await connection.send(cmd('hello'));

    await waitOn();

    await connection.close();

    expect(connection.type).toEqual(TransportType.AMQP);
  });

  test('send and recieve event', async () => {
    const amqp = new AmqpStrategy({
      host: '127.0.0.1',
      port: 5672,
      user: 'guest',
      password: 'guest',
      app: 'test',
    });

    const amqp2 = new AmqpStrategy({
      host: '127.0.0.1',
      port: 5672,
      user: 'guest',
      password: 'guest',
      app: 'test2',
    });

    const connection = await amqp.connect();
    const connection2 = await amqp2.connect();

    connection.message.subscribe({
      next: pipe(
        (v) => jsonTransformer.decode(v.data) as MessagePayload<string>,
        (data) => {
          expect(data.payload).toEqual('hello event');
          expect(data.type).toEqual('Event');
        }
      ),
    });

    connection2.message.subscribe({
      next: pipe(
        (v) => jsonTransformer.decode(v.data) as MessagePayload<string>,
        (data) => {
          expect(data.payload).toEqual('hello event');
          expect(data.type).toEqual('Event');
        }
      ),
    });

    const event = createEvent<string>('test.test');

    await connection.subscribe(event);
    await connection2.subscribe(event);

    await connection.publish(event('hello event'));

    await connection.close();
    await connection2.close();
  });

  test('nack message and resend', async () => {
    const amqp = new AmqpStrategy({
      host: '127.0.0.1',
      port: 5672,
      user: 'guest',
      password: 'guest',
      app: 'test',
    });

    const connection = await amqp.connect();

    let msgCount = 0;
    const waitOn = wait((resolve) => {
      connection.message.subscribe({
        next: pipe(
          (v) => (msgCount < 1 ? connection.nack(v) : connection.ack(v)),
          (v) => v as Message<Buffer>,
          (v) => jsonTransformer.decode(v.data) as MessagePayload<string>,
          (data) => {
            expect(data.payload).toEqual('hello');
            expect(data.type).toEqual('Command');

            msgCount++;
          },
          () => msgCount === 2 && resolve(undefined)
        ),
      });
    });

    const cmd = createCommand<string>('test.test');

    await connection.handle(cmd);

    await connection.send(cmd('hello'));

    await waitOn();

    await connection.close();

    expect(msgCount).toEqual(2);
  });

  test('send and reply command', async () => {
    const amqp = new AmqpStrategy({
      host: '127.0.0.1',
      port: 5672,
      user: 'guest',
      password: 'guest',
      app: 'test',
    });

    const connection = await amqp.connect();

    const waitOn = wait((resolve) => {
      connection.message.subscribe({
        next: pipe(
          (v) => connection.ack(v),
          (v) => v as Message<Buffer>,
          (v) => {
            const data = jsonTransformer.decode(
              v.data
            ) as MessagePayload<string>;
            expect(data.payload).toEqual('hello');
            expect(data.type).toEqual('Command');
            return v;
          },
          async (v) => {
            expect(v.replyTo).toBeDefined();
            await connection.reply(replyTo(v)('reply'));
            resolve(undefined);
          }
        ),
      });
    });

    const cmd = createCommand<string>('test.test');

    await connection.handle(cmd);

    const [res] = await Promise.all([
      connection.send(cmd('hello'), true),
      waitOn(),
    ]);

    await connection.close();

    expect(jsonTransformer.decode((res as Message<Buffer>).data)).toEqual({
      payload: 'reply',
      type: 'Reply',
    });

    expect(connection.type).toEqual(TransportType.AMQP);
  });
});

const wait = (nextFn: (resolve: (r: unknown) => void) => void) => () =>
  new Promise(nextFn);
