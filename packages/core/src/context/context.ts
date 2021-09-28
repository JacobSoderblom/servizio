import * as R from 'fp-ts/lib/Reader';
import * as M from 'fp-ts/lib/Map';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/function';

import { ordToken, setoidToken, Token } from './token';

export type Context = Map<Token, Dependency<unknown> | any>;

export type Reader<T> = R.Reader<Context, T>;

export type Provider = <T>(token: Token<T>) => O.Option<T>;

export interface Dependency<T> {
  type: 'LAZY';
  fn: () => Reader<T>;
}

export interface BoundedDependency<T, D extends Dependency<T> = Dependency<T>> {
  token: Token<T>;
  dependency: D;
}

export const addDependency =
  <T>(bDep: BoundedDependency<T>) =>
  (ctx: Context): Context =>
    M.upsertAt(setoidToken)(bDep.token, bDep.dependency)(ctx);

const resolveDependency =
  <T>(ctx: Context, token: Token<T>) =>
  (dep: Dependency<T> | any) =>
    pipe(
      dep,
      O.fromPredicate((d) => !!d.fn),
      O.fold(
        () => dep,
        (dep: Dependency<T>) => {
          const rDep = dep.fn()(ctx);
          ctx.set(token, rDep);
          return rDep;
        }
      )
    );

export const lookup =
  (ctx: Context) =>
  <T>(token: Token<T>): O.Option<T> =>
    pipe(
      M.lookup(ordToken)(token, ctx),
      O.map(resolveDependency(ctx, token)),
      O.fold(() => O.none, O.some)
    );

export const reader = pipe(R.ask<Context>(), R.map(lookup));

export const createContext =
  (ctx: Context = new Map() as Context) =>
  (...deps: BoundedDependency<unknown>[]): Context =>
    deps.reduce((c, dep) => addDependency(dep)(c), new Map(ctx) as Context);

export const bindTo =
  <T>(token: Token<T>) =>
  <D extends Reader<T>>(dep: D): BoundedDependency<T, Dependency<T>> => ({
    token,
    dependency: {
      type: 'LAZY',
      fn: () => dep,
    },
  });
