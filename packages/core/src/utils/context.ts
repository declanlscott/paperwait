import { AsyncLocalStorage } from "node:async_hooks";

export function createContext<TContext>(name: string) {
  const storage = new AsyncLocalStorage<TContext>();

  return {
    use: () => {
      const context = storage.getStore();
      if (!context) throw new Error(`${name} context not found`);

      return context;
    },
    with: <TCallback extends () => ReturnType<TCallback>>(
      context: TContext,
      callback: TCallback,
    ) => storage.run(context, callback),
  };
}
