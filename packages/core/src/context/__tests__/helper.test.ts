import { pipe } from 'fp-ts/lib/function';
import * as R from 'fp-ts/lib/Reader';
import * as O from 'fp-ts/lib/Option';

import { createContext, bindTo, reader } from '../context';
import { createToken } from '../token';

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
  });
});
