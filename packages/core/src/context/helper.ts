import { console } from 'fp-ts';
import { identity, pipe } from 'fp-ts/lib/function';
import { fold } from 'fp-ts/lib/Option';
import { Provider } from './context';
import { Token } from './token';

export const useContext =
  <T>(token: Token<T>) =>
  (ask: Provider) =>
    pipe(
      ask(token),
      fold(() => {
        const err = new Error(
          `Cannot resolve "${token.name || token._id}" context token.`
        );

        console.error(err.stack);

        throw err;
      }, identity)
    );
