import { AccessControl } from "@printworks/core/access-control";
import { HttpError } from "@printworks/core/utils/errors";
import { createMiddleware } from "hono/factory";

import type { Action, Resource } from "@printworks/core/access-control/shared";

export const authorization = (resource: Resource, action: Action) =>
  createMiddleware(async (_, next) => {
    await AccessControl.enforce([resource, action], {
      Error: HttpError.Forbidden,
      args: [],
    });

    return next();
  });
