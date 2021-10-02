import * as S from 'io-ts/Schema';
import { Observable, take } from 'rxjs';
import { isRight } from 'fp-ts/Either';

import { createValidator } from '../validator';

describe('Validator test cases', () => {
  test.each([
    [{ name: 'test', age: 20 }, true],
    [{ name: 'test', age: '20' }, false],
  ])('running validator test case (%p, %p)', (obj, expected) => {
    const testSchema = S.make((S) =>
      S.struct({
        name: S.string,
        age: S.number,
      })
    );

    const resolveFn = (obs: Observable<unknown>) => {
      let data: unknown;
      obs.pipe(take(1)).subscribe((value) => (data = value));
      return data;
    };

    const observable = new Observable((subscriber) => {
      subscriber.next(obj);
    });

    const validator = createValidator(resolveFn)(testSchema);

    expect(isRight(validator(observable))).toEqual(expected);
  });
});
