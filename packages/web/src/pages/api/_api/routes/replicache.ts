import { Replicache } from "@printworks/core/replicache";
import {
  ApplicationError,
  HttpError,
  ReplicacheError,
} from "@printworks/core/utils/errors";
import { Hono } from "hono";

import { authn } from "~/api/middleware/auth";

export default new Hono()
  .use(authn)
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

  if (error instanceof ReplicacheError.UnrecoverableError) {
    switch (error.name) {
      case "BadRequest":
        throw new HttpError.BadRequest(error.message);
      case "Unauthorized":
        throw new HttpError.Unauthorized(error.message);
      case "MutationConflict":
        throw new HttpError.Conflict(error.message);
      default:
        error.name satisfies never;
        throw new HttpError.InternalServerError(error.message);
    }
  }
  if (error instanceof ApplicationError.Error) {
    switch (error.name) {
      case "Unauthenticated":
        throw new HttpError.Unauthorized(error.message);
      case "AccessDenied":
        throw new HttpError.Forbidden(error.message);
      default:
        throw new HttpError.InternalServerError(error.message);
    }
  }

  throw new HttpError.InternalServerError("An unexpected error occurred");
}
