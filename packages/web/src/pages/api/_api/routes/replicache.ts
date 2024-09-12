import { ApplicationError } from "@paperwait/core/errors/application";
import {
  BadRequest,
  Conflict,
  Forbidden,
  InternalServerError,
  Unauthorized,
} from "@paperwait/core/errors/http";
import { UnrecoverableError } from "@paperwait/core/errors/replicache";
import * as Replicache from "@paperwait/core/replicache";
import { Hono } from "hono";

import { authorization } from "~/api/middleware";

export default new Hono()
  .use(authorization())
  .post("/pull", async (c) => {
    const pullRequest: unknown = await c.req.json();

    const pullResponse =
      await Replicache.pull(pullRequest).catch(rethrowHttpError);

    return c.json(pullResponse, 200);
  })
  .post("/push", async (c) => {
    const pushRequest: unknown = await c.req.json();

    const pushResponse =
      await Replicache.push(pushRequest).catch(rethrowHttpError);

    return c.json(pushResponse, 200);
  });

function rethrowHttpError(error: Error): never {
  console.error(error);

  if (error instanceof UnrecoverableError) {
    switch (error.name) {
      case "BadRequest":
        throw new BadRequest(error.message);
      case "Unauthorized":
        throw new Unauthorized(error.message);
      case "MutationConflict":
        throw new Conflict(error.message);
      default:
        error.name satisfies never;
        throw new InternalServerError(error.message);
    }
  }
  if (error instanceof ApplicationError) {
    switch (error.name) {
      case "Unauthenticated":
        throw new Unauthorized(error.message);
      case "AccessDenied":
        throw new Forbidden(error.message);
      default:
        throw new InternalServerError(error.message);
    }
  }

  throw new InternalServerError("An unexpected error occurred");
}
