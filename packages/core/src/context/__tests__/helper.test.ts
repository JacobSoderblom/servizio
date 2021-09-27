import { pipe } from 'fp-ts/lib/function';
import * as R from 'fp-ts/lib/Reader';
import * as O from 'fp-ts/lib/Option';

import { createContext, bindTo, reader, lookup } from '../context';
import { createToken } from '../token';
import { createReader, useContext } from '../helper';

describe('useContext', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation();
  });

  test('resolve dependency', () => {
    const t1 = createToken<number>();
    const t2 = createToken<number>();

    const ctx = createContext()(
      bindTo(t1)(() => 1),
      bindTo(t2)(
        pipe(
          reader,
          R.map((ask) =>
            pipe(
              ask(t1),
              O.map((val) => val + 1),
              O.getOrElse(() => 0)
            )
          )
        )
      )
    );

    const ask = lookup(ctx);

    const dep1 = () => useContext(t1)(ask);
    const dep2 = () => useContext(t2)(ask);

    expect(dep1()).toEqual(1);
    expect(dep2()).toEqual(2);
  });

  test('throw on unknown dependency', () => {
    const t1 = createToken<number>();
    const t2 = createToken<number>();

    const ctx = createContext()(bindTo(t1)(() => 1));

    const ask = lookup(ctx);

    const dep1 = () => useContext(t1)(ask);
    const dep2 = () => useContext(t2)(ask);

    expect(dep1()).toEqual(1);
    expect(dep2).toThrowError();
  });
});

describe('createReader', () => {
  test('resolve dependency', () => {
    const t1 = createToken<number>();
    const t2 = createToken<number>();

    const ctx = createContext()(
      bindTo(t1)(() => 1),
      bindTo(t2)(
        createReader((ask) =>
          pipe(
            ask(t1),
            O.map((val) => val + 1),
            O.getOrElse(() => 0)
          )
        )
      )
    );

    const ask = lookup(ctx);

    const dep1 = () => useContext(t1)(ask);
    const dep2 = () => useContext(t2)(ask);

    expect(dep1()).toEqual(1);
    expect(dep2()).toEqual(2);
  });
});
