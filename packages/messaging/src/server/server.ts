import { Context, ServerIO } from '@servizio/core';
import { createTransport } from '../transport/create';
import { TransportConnection, TransportType } from '../transport/transport';
import { ServerConfig } from './server.config';

export interface Options<T extends TransportType> {
  type: T;
  options: ServerConfig<T>;
}

export const messagingServer =
  <T extends TransportType>({ type, options }: Options<T>) =>
  (ctx: Context) => {
    const transport = createTransport(type, options);

    if (!transport) {
      throw new Error(`Could not find transport '${type}'`);
    }

    const listen: ServerIO<TransportConnection> = async () => {
      const connection = await transport.connect();

      return connection;
    };

    listen.ctx = ctx;

    return listen;
  };
