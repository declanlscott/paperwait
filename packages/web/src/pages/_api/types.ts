import type { ProviderData } from "@paperwait/core/auth-provider";
import type { Env } from "hono";

declare module "hono" {
  interface ContextVariableMap {
    provider?: ProviderData;
  }
}

export interface HonoEnv extends Env {
  Bindings: {
    locals: App.Locals;
  };
}
