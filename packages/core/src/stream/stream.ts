import { asyncScheduler, merge, Observable, SchedulerLike, share } from 'rxjs';

import * as context from '../context/context';

export interface StreamContext<T, U extends SchedulerLike = SchedulerLike> {
  ask: context.Provider;
  scheduler: U;
  client: T;
}

export interface Stream<Input, Output, Client> {
  (input: Observable<Input>, ctx: StreamContext<Client>): Observable<Output>;
}

export interface StreamMiddleware<Input, Output> {
  (input: Observable<Input>, ...args: any[]): Observable<Output>;
}

export const combineStreams =
  <I, O, C>(...handlers: Stream<I, O, C>[]) =>
  (input: Observable<I>, ctx: StreamContext<C>) =>
    merge(...handlers.map((handler) => handler(input, ctx))).pipe(share());

export const combineMiddlewares =
  <I, O>(...handlers: Stream<I, I, O>[]) =>
  (input: Observable<I>, ctx: StreamContext<O>) =>
    handlers.reduce((i, handler) => handler(i, ctx), input);

export const createStreamContext = <
  Client,
  Scheduler extends SchedulerLike
>(data: {
  ask: context.Provider;
  client: Client;
  scheduler?: Scheduler;
}): StreamContext<Client> => ({
  ...data,
  scheduler: data.scheduler || (typeof asyncScheduler as any),
});
