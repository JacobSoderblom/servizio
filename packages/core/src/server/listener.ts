import { flow } from 'fp-ts/lib/function';
import { Reader } from 'fp-ts/lib/Reader';

import { createReader } from '../context/helper';
import { Context, Provider } from '../context/context';
import { Stream, StreamMiddleware } from '../stream/stream';

export interface ListenerConfig {
  streams?: Stream<unknown, unknown, unknown>[];
  middlewares?: StreamMiddleware<unknown, unknown>[];
}

export type ListenerHandler = (...args: any[]) => void;

export type Listener<
  T extends ListenerConfig = ListenerConfig,
  U extends ListenerHandler = ListenerHandler
> = (config?: T) => Reader<Context, U>;

export const createListener = <
  T extends ListenerConfig,
  U extends ListenerHandler
>(
  fn: (config?: T) => (ask: Provider) => U
): Listener<T, U> => flow(fn, createReader);
