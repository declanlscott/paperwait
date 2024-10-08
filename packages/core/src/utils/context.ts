import { AsyncLocalStorage } from "node:async_hooks";

export function createContext<TContext>() {
  const storage = new AsyncLocalStorage<TContext>();

  return {
    use: () => {
      const context = storage.getStore();
      if (!context) throw new Error("Context not found.");

      return context;
    },
    with: <TCallback extends () => ReturnType<TCallback>>(
      context: TContext,
      callback: TCallback,
    ) => storage.run(context, callback),
  };
}
