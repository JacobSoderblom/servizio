import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';
import { bindTo, createContext } from '../../context/context';
import { createToken } from '../../context/token';
import { createListener, ListenerConfig } from '../listener';

describe('Transporter', () => {
  test('create a transporter', () => {
    const transporter = createListener<
      ListenerConfig,
      (a: number, b: number) => number
    >(() => () => (a, b) => a + b);

    const ctx = createContext()();

    const calc = transporter({})(ctx);

    expect(calc(1, 1)).toEqual(2);
  });

  test('create a transporter with dependency', () => {
    const token = createToken<number>();
    const transporter = createListener<ListenerConfig, (a: number) => number>(
      () => (ask) => {
        const b = pipe(
          ask(token),
          O.map((val) => val),
          O.getOrElse(() => 0)
        );
        return (a) => a * b;
      }
    );

    const ctx = createContext()(bindTo(token)(() => 2));
    const calc = transporter({})(ctx);

    expect(calc(1)).toEqual(2);
  });
});
