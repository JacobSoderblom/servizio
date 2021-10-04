import * as S from 'io-ts/Schema';
import * as D from 'io-ts/Decoder';
import { Observable } from 'rxjs';
import { pipe } from 'fp-ts/lib/function';

export const createValidator =
  (resolveFn: (e: Observable<unknown>) => unknown) =>
  (schema: S.Schema<unknown>) =>
  (event: Observable<unknown>) =>
    pipe(event, resolveFn, (data) => {
      const dataDecoder = S.interpreter(D.Schemable)(schema);
      return dataDecoder.decode(data);
    });
