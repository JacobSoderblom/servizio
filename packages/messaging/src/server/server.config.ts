import { AmqpOptions } from '../strategies/amqp/amqp';
import { TransportType } from '../transport/transport';

export interface StrategyConfigs {
  [TransportType.AMQP]: AmqpOptions;
}

export type ServerConfig<T extends TransportType> = StrategyConfigs[T];
