import { createContext } from '../context/context';
import { createLogger, useLogger } from './logger';

describe('logger', () => {
  test('should be able to get instance of logger from context', () => {
    const loggerDep = createLogger();

    const ctx = createContext()(loggerDep);

    const logger = useLogger(ctx);

    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
  });

  test('default logger instance if non is found', () => {
    const ctx = createContext()();

    const logger = useLogger(ctx);

    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
  });
});
