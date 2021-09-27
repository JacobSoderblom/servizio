import { console } from 'fp-ts';
import { identity, pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';
import * as R from 'fp-ts/lib/Reader';

import { Provider, reader } from './context';
import { Token } from './token';

export const useContext =
  <T>(token: Token<T>) =>
  (ask: Provider) =>
    pipe(
      ask(token),
      O.fold(() => {
        const err = new Error(
          `Cannot resolve "${token.name || token._id}" context token.`
        );

        console.error(err.stack);

        throw err;
      }, identity)
    );

export const createReader = <T>(handler: (ask: Provider) => T) =>
  pipe(reader, R.map(handler));
