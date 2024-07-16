import type { ProviderData } from "@paperwait/core/auth-provider";

declare module "hono" {
  interface ContextVariableMap {
    provider?: ProviderData;
  }
}

export type HonoParameters = {
  Bindings: App.Locals;
};
