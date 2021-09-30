import { Lazy } from 'fp-ts/lib/function';
import { AmqpStrategy } from '../strategies/amqp/amqp';
import { Transport, TransportType } from './transport';

const switchCase = <T extends string | number | symbol, U, D = U>(
  value: T,
  cases: Record<T, Lazy<U>>,
  def: Lazy<D>
) => (value in cases ? cases[value]() : def());

const map = (options: any = {}): Record<TransportType, Lazy<Transport>> => ({
  [TransportType.AMQP]: () => new AmqpStrategy(options),
});

export const createTransport = <T extends TransportType>(
  type: T,
  options: any
) => switchCase(type, map(options), () => undefined);
