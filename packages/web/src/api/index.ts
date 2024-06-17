import { DatabaseError, HttpError, OAuthError } from "@paperwait/core/errors";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { parse } from "superjson";

import auth from "~/api/routes/auth";
import organization from "~/api/routes/organization";
import papercut from "~/api/routes/papercut";
import replicache from "~/api/routes/replicache";
import user from "~/api/routes/user";

import type { ProviderData } from "@paperwait/core/auth-provider";

declare module "hono" {
  interface ContextVariableMap {
    locals: App.Locals;
    provider?: ProviderData;
  }
}

export type Bindings = Record<keyof App.Locals, string>;

const api = new Hono<{ Bindings: Bindings }>()
  .basePath("/api/")
  .use(logger())
  .use(async (c, next) => {
    c.set("locals", {
      session: parse<App.Locals["session"]>(c.env.session),
      user: parse<App.Locals["user"]>(c.env.user),
      org: parse<App.Locals["org"]>(c.env.org),
    });

    await next();
  })
  .route("/auth", auth)
  .route("/organization", organization)
  .route("/papercut", papercut)
  .route("/replicache", replicache)
  .route("/user", user)
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HttpError)
      return c.json(e.message, { status: e.statusCode });
    if (e instanceof OAuthError) return c.json(e.message, { status: 400 });
    if (e instanceof DatabaseError) return c.json(e.message, { status: 500 });
    if (e instanceof HTTPException) return e.getResponse();

    return c.json("Internal server error", { status: 500 });
  });

export default api;

export type Api = typeof api;
