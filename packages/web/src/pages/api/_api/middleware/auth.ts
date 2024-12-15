import { AccessControl } from "@printworks/core/access-control";
import { useAuthn } from "@printworks/core/auth/context";
import { HttpError } from "@printworks/core/utils/errors";
import { createMiddleware } from "hono/factory";

import type { Action, Resource } from "@printworks/core/access-control/shared";

export const authn = createMiddleware((_, next) => {
  useAuthn();

  return next();
});

export const authz = (resource: Resource, action: Action) =>
  createMiddleware(async (_, next) => {
    await AccessControl.enforce([resource, action], {
      Error: HttpError.Forbidden,
      args: [],
    });

    return next();
  });
