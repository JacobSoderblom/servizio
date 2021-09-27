import pino from 'pino';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';

import { createReader } from '../context/helper';
import { createToken } from '../context/token';
import { bindTo } from '../context/context';

export const Token = createToken<pino.Logger>('LOGGER');

export const createLogger = (
  opts?: pino.LoggerOptions | pino.DestinationStream | undefined
) => bindTo(Token)(() => pino(opts));

export const useLogger = createReader((ask) =>
  pipe(
    ask(Token),
    O.getOrElse(() => pino())
  )
);
