import { createToken } from '../../context/token';
import { bindTo, Context, createContext } from '../../context/context';
import { createMicroservice, ServerIO } from '../server';

describe('Server', () => {
  test('create a microservice that accepts other servers', async () => {
    let hasResolved = false;

    const timer = (ctx?: Context) => {
      const newCtx = createContext(ctx)();

      const server: ServerIO<void> = () =>
        new Promise((resolve) => {
          setTimeout(() => {
            hasResolved = true;
            resolve();
          }, 500);
        });

      server.ctx = newCtx;

      return server;
    };

    const microservice = createMicroservice({
      servers: [timer],
    });

    await microservice();

    expect(hasResolved).toBeTruthy();
  });

  test('check dependencies in servers', async () => {
    const t1 = createToken<number>();
    const t2 = createToken<number>();

    let hasResolved = false;

    const depChecker = (ctx?: Context) => {
      expect(ctx?.size).toEqual(1);

      const newCtx = createContext(ctx)(bindTo(t2)(() => 2));

      const server: ServerIO<void> = () =>
        new Promise((resolve) => {
          setTimeout(() => {
            hasResolved = true;
            expect(newCtx.size).toEqual(2);
            expect(newCtx.get(t1).fn()(newCtx)).toEqual(1);
            expect(newCtx.get(t2).fn()(newCtx)).toEqual(2);
            resolve();
          }, 500);
        });

      server.ctx = newCtx;

      return server;
    };

    const microservice = createMicroservice({
      servers: [depChecker],
      dependencies: [bindTo(t1)(() => 1)],
    });

    await microservice();

    expect(hasResolved).toBeTruthy();
  });
});
