import { Observable } from 'rxjs';

import * as context from '../context/context';

export interface HandlerContext {
  ask: context.Provider;
}

export type Handler = <Input, Output>(
  input: Observable<Input>,
  ctx: HandlerContext
) => Observable<Output>;
