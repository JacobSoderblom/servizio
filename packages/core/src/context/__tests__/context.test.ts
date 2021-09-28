import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';
import * as R from 'fp-ts/lib/Reader';

import {
  createContext,
  bindTo,
  Context,
  lookup,
  addDependency,
  reader,
} from '../context';
import { createToken } from '../token';

describe('Context', () => {
  describe('Binding', () => {
    test('bind lazy dependency', () => {
      const ctx = createContext()();
      const token = createToken<number>();

      const bDep = bindTo(token)(
        pipe(
          R.ask<Context>(),
          R.map(() => 1)
        )
      );

      expect(bDep.token).toBe(token);
      expect(bDep.dependency.type).toEqual('LAZY');
      expect(bDep.dependency.fn()(ctx)).toEqual(1);
    });
  });

  describe('Dependencies', () => {
    test('add dependency', () => {
      let ctx = createContext()();
      const token = createToken<number>();
      const bDep = bindTo(token)(
        pipe(
          R.ask<Context>(),
          R.map(() => 1)
        )
      );

      ctx = addDependency(bDep)(ctx);

      expect(ctx.has(token)).toBeTruthy();
      expect(ctx.get(token).fn).toBeDefined();
      expect(ctx.get(token).fn()(ctx)).toEqual(1);
    });

    test('create context with dependencies', () => {
      const t1 = createToken<number>();
      const dep1 = bindTo(t1)(
        pipe(
          R.ask<Context>(),
          R.map(() => 1)
        )
      );
      const t2 = createToken<number>();
      const dep2 = bindTo(t2)(() => 3);

      const ctx = createContext()(dep1, dep2);

      expect(ctx.size).toEqual(2);
      expect(ctx.get(t1).fn).toBeDefined();
      expect(ctx.get(t2).fn).toBeDefined();
      expect(ctx.get(t1).fn()(ctx)).toEqual(1);
      expect(ctx.get(t2).fn()(ctx)).toEqual(3);
    });

    test('create context with parent context', () => {
      const t1 = createToken<number>();
      const dep1 = bindTo(t1)(
        pipe(
          R.ask<Context>(),
          R.map(() => 1)
        )
      );
      const t2 = createToken<number>();
      const dep2 = bindTo(t2)(() => 1);

      const ctx1 = createContext()(dep1);
      const ctx2 = createContext(ctx1)(dep2);

      expect(ctx1.size).toEqual(1);
      expect(ctx1.get(t1).fn).toBeDefined();
      expect(ctx1.get(t1).fn()(ctx1)).toEqual(1);
      expect(ctx2.size).toEqual(2);
      expect(ctx2.get(t2).fn).toBeDefined();
      expect(ctx2.get(t2).fn()(ctx2)).toEqual(1);
    });
  });

  describe('Lookup', () => {
    test('ask for lazy dependency', () => {
      const t1 = createToken<number>();
      const t2 = createToken<number>();
      const dep1 = pipe(
        reader,
        R.map(() => 1)
      );
      const dep2 = pipe(
        reader,
        R.map((ask) =>
          pipe(
            ask(t1),
            O.map((val) => val + 1),
            O.getOrElse(() => 0)
          )
        )
      );

      const ctx1 = createContext()(bindTo(t1)(dep1), bindTo(t2)(dep2));

      expect(lookup(ctx1)(t1)).toEqual(O.some(1));
      expect(lookup(ctx1)(t2)).toEqual(O.some(2));
    });

    test('lazy dependency should only initiate once', () => {
      const spy = jest.fn();
      const token = createToken<number>();
      const dep = pipe(
        reader,
        R.map(() => {
          spy();
          return 1;
        })
      );

      const ctx = createContext()(bindTo(token)(dep));

      // running expect twice on same value to ensure only one execution
      expect(lookup(ctx)(token)).toEqual(O.some(1));
      expect(lookup(ctx)(token)).toEqual(O.some(1));
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
