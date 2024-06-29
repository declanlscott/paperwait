import type { ProviderData } from "@paperwait/core/auth-provider";

declare module "hono" {
  interface ContextVariableMap {
    locals: App.Locals;
    provider?: ProviderData;
  }
}
