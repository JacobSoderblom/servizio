import * as E from 'fp-ts/lib/Either';
import { identity, pipe } from 'fp-ts/lib/function';

export interface MessageTransformer {
  decode: <T>(data: Buffer) => T | Error;
  encode: <T>(data: T) => Buffer | Error;
}

export const jsonTransformer: MessageTransformer = {
  decode: <T>(data: Buffer) =>
    pipe(
      E.tryCatch(() => JSON.parse(data.toString()) as T, E.toError),
      E.fold<Error, T, T | Error>(identity, identity)
    ),
  encode: <T>(data: T) =>
    pipe(
      E.tryCatch(() => JSON.stringify(data), E.toError),
      E.map(Buffer.from),
      E.fold<Error, Buffer, Buffer | Error>(identity, identity)
    ),
};
