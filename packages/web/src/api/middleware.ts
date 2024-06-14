import { validateProvider } from "@paperwait/core/auth";
import { UnauthorizedError } from "@paperwait/core/errors";
import { createMiddleware } from "hono/factory";

import { authorize } from "~/api/lib/auth/authorize";

import type { UserRole } from "@paperwait/core/user";

export const authorization = (roles?: Array<UserRole>) =>
  createMiddleware(async (c, next) => {
    authorize(c.get("locals"), roles);

    await next();
  });

export const provider = createMiddleware(async (c, next) => {
  const session = c.get("locals").session;
  if (!session) throw new UnauthorizedError("Session not found");

  c.set("provider", await validateProvider(session.id));

  await next();
});
