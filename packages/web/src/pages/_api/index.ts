import { DatabaseError } from "@paperwait/core/errors/database";
import { HttpError } from "@paperwait/core/errors/http";
import {
  ArcticFetchError,
  OAuth2RequestError,
} from "@paperwait/core/errors/oauth2";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import auth from "~/api/routes/auth";
import files from "~/api/routes/files";
import integrations from "~/api/routes/integrations";
import organizations from "~/api/routes/organizations";
import replicache from "~/api/routes/replicache";
import users from "~/api/routes/users";

const api = new Hono()
  .basePath("/api/")
  .use(logger())
  .route("/auth", auth)
  .route("/files", files)
  .route("/integrations", integrations)
  .route("/organizations", organizations)
  .route("/replicache", replicache)
  .route("/users", users)
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HttpError)
      return c.json(e.message, { status: e.statusCode });
    if (e instanceof OAuth2RequestError)
      return c.json(e.description, { status: 400 });
    if (e instanceof ArcticFetchError)
      return c.json(e.message, { status: 500 });
    if (e instanceof DatabaseError) return c.json(e.message, { status: 500 });
    if (e instanceof HTTPException) return e.getResponse();

    return c.json("Internal server error", { status: 500 });
  });

export default api;

export type Api = typeof api;
