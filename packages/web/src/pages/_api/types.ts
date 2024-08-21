import type { OAuth2ProviderData } from "@paperwait/core/oauth2";
import type { Env } from "hono";

declare module "hono" {
  interface ContextVariableMap {
    oAuth2Provider?: OAuth2ProviderData;
  }
}

export interface HonoEnv extends Env {
  Bindings: {
    locals: App.Locals;
  };
}
