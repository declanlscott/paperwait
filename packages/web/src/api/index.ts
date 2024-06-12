import {
  BadRequestError,
  DatabaseError,
  HttpError,
} from "@paperwait/core/errors";
import { validate } from "@paperwait/core/valibot";
import { OAuth2RequestError } from "arctic";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { parse } from "superjson";

import { DeserializedBindings } from "~/api/lib/bindings";
import auth from "~/api/routes/auth";
import organization from "~/api/routes/organization";
import papercut from "~/api/routes/papercut";
import replicache from "~/api/routes/replicache";

import type { SerializedBindings } from "~/api/lib/bindings";

declare module "hono" {
  interface ContextVariableMap {
    locals: App.Locals;
  }
}

const api = new Hono<{ Bindings: SerializedBindings }>()
  .basePath("/api/")
  .use(logger())
  .use(async (c, next) => {
    c.set(
      "locals",
      validate(
        DeserializedBindings,
        {
          session: parse(c.env.session),
          user: parse(c.env.user),
          org: parse(c.env.org),
        },
        {
          Error: BadRequestError,
          message: "Invalid api context bindings",
        },
      ),
    );

    await next();
  })
  .route("/auth", auth)
  .route("/organization", organization)
  .route("/papercut", papercut)
  .route("/replicache", replicache)
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HttpError)
      return c.json(e.message, { status: e.statusCode });
    if (e instanceof OAuth2RequestError)
      return c.json(e.message, { status: 400 });
    if (e instanceof DatabaseError) return c.json(e.message, { status: 500 });
    if (e instanceof HTTPException) return e.getResponse();

    return c.json("Internal server error", { status: 500 });
  });

export default api;

export type Api = typeof api;
