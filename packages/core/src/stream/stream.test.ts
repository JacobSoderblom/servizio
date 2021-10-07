import { mapTo, filter } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';

import { Stream, combineStreams, StreamContext } from './stream';

type NumberStream = Stream<
  { type: string; payload: number },
  { type: string; payload: number },
  unknown
>;

describe('Stream', () => {
  test('combine streams', () => {
    const a: NumberStream = (stream) =>
      stream.pipe(
        filter((s) => s.type === 'a'),
        mapTo({ type: 'a', payload: 1 })
      );
    const b: NumberStream = (stream) =>
      stream.pipe(
        filter((s) => s.type === 'b'),
        mapTo({ type: 'b', payload: 2 })
      );
    const c: NumberStream = (stream) =>
      stream.pipe(
        filter((s) => s.type === 'c'),
        mapTo({ type: 'c', payload: 3 })
      );

    const streams = combineStreams(a, b, c);

    Marble.assertEffect(streams, [
      [
        '-a--b--c---',
        {
          a: { type: 'a', payload: 0 },
          b: { type: 'b', payload: 0 },
          c: { type: 'c', payload: 0 },
        },
      ],
      [
        '-a--b--c---',
        {
          a: { type: 'a', payload: 1 },
          b: { type: 'b', payload: 2 },
          c: { type: 'c', payload: 3 },
        },
      ],
    ]);
  });
});

type MarbleFlow =
  | [string, { [marble: string]: any } | undefined]
  | [string, { [marble: string]: any } | undefined, any];

const Marble = {
  deepEquals: (actual: any, expected: any) => expect(actual).toEqual(expected),

  createTestScheduler: () => new TestScheduler(Marble.deepEquals),

  assertEffect: (
    stream: Stream<any, any, any>,
    marbleflow: [MarbleFlow, MarbleFlow],
    ctx: Partial<StreamContext<any>> = {}
  ) => {
    const [initStream, initValues, initError] = marbleflow[0];
    const [expectedStream, expectedValues, expectedError] = marbleflow[1];

    const scheduler = Marble.createTestScheduler();
    const streams = scheduler.createColdObservable(
      initStream,
      initValues,
      initError
    );

    scheduler
      .expectObservable(stream(streams, ctx as StreamContext<any>))
      .toBe(expectedStream, expectedValues, expectedError);

    scheduler.flush();
  },
};
