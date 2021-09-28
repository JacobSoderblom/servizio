import { flow } from 'fp-ts/lib/function';
import { Reader } from 'fp-ts/lib/Reader';

import { createReader } from '../context/helper';
import { Context, Provider } from '../context/context';
import { Handler } from './handler';

export interface TransporterConfig {
  handlers?: Handler[];
  middlewares?: Handler[];
}

export type TransporterHandler = (...args: any[]) => void;

export type Transporter<
  T extends TransporterConfig = TransporterConfig,
  U extends TransporterHandler = TransporterHandler
> = (config?: T) => Reader<Context, U>;

export const createTransporter = <
  T extends TransporterConfig,
  U extends TransporterHandler
>(
  fn: (config?: T) => (ask: Provider) => U
): Transporter<T, U> => flow(fn, createReader);
