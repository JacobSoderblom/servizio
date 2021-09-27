import { Eq } from 'fp-ts/lib/Eq';
import { contramap, Ord } from 'fp-ts/lib/Ord';
import { Ord as ordString } from 'fp-ts/string';
import { v4 as uuid } from 'uuid';

export class Token<T = any> {
  _id = uuid();
  _T!: T;
  constructor(public name?: string) {}
}

export const createToken = <T>(name?: string) =>
  new (class extends Token<T> {
    constructor() {
      super(name);
    }
  })();

export const ordToken: Ord<Token<unknown>> = contramap(
  (t: Token<unknown>) => t._id
)(ordString);

export const setoidToken: Eq<Token> = { equals: ordToken.equals };
