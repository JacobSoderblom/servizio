import { IO } from 'fp-ts/lib/IO';

import { BoundedDependency, Context, createContext } from '../context/context';
import { Listener } from './listener';

export interface ServerConfig {
  transporters: Listener[];
  dependencies?: BoundedDependency<unknown>[];
}

export interface ServerIO<T> extends IO<Promise<T>> {
  ctx: Context;
}

export type ServerCreator = (ctx?: Context) => ServerIO<unknown>;

export interface MicroserviceConfig {
  servers: ServerCreator[];
  dependencies?: BoundedDependency<unknown>[];
}

export const createMicroservice = (config: MicroserviceConfig) => {
  const ctx = createContext()(...(config.dependencies || []));

  const server: ServerIO<void> = async () => {
    await Promise.all(config.servers.map((s) => s(ctx)()));
  };

  server.ctx = ctx;

  return server;
};
