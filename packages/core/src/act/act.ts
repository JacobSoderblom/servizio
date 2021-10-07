import { pipe } from 'fp-ts/lib/function';
import { defer, mergeMap, Observable } from 'rxjs';

function act<Input, Output, Error>(
  actFn: (i: Input) => Observable<Output>,
  onError?: (error: any, i: Input) => Error | Observable<Error>
) {
  return (stream: Observable<Input>) =>
    stream.pipe(
      mergeMap((ev) =>
        defer(() => {
          try {
            return pipe(actFn(ev));
          } catch (err) {}
        })
      )
    );
}

export default act;
