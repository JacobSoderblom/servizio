import { connect } from 'amqplib';
import { Transport, TransportType } from '../../transport/transport';
import { AmqpConnection } from './connection';

export interface AmqpOptions {
  url?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  prefetch?: number;
  app: string;
}

export class AmqpStrategy implements Transport<TransportType.AMQP> {
  constructor(private options: AmqpOptions) {}

  private getUrl() {
    const { url, host, port, user, password } = this.options;

    if (url) {
      return url;
    }

    if (!host || !port || !user || !password) {
      return 'amqp://localhost';
    }

    return `amqp://${user}:${password}@${host}:${port}`;
  }

  get type() {
    return TransportType.AMQP;
  }

  async connect() {
    const { prefetch, app } = this.options;

    const url = this.getUrl();

    const connection = await connect(url);

    const sendChannel = await connection.createChannel();
    sendChannel.prefetch(prefetch || 1);

    const listenChannel = await connection.createChannel();
    listenChannel.prefetch(prefetch || 1);

    const confirmChannel = await connection.createConfirmChannel();
    confirmChannel.prefetch(prefetch || 1);

    return new AmqpConnection(
      connection,
      listenChannel,
      sendChannel,
      confirmChannel,
      {
        queueSuffix: app,
        exchangeOptions: {},
        queueOptions: { durable: true },
      }
    );
  }
}
