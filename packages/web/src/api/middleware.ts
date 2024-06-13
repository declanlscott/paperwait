import { validateProvider } from "@paperwait/core/auth";
import { UnauthorizedError } from "@paperwait/core/errors";
import { createMiddleware } from "Hono/factory";

import { authorize } from "~/api/lib/auth/authorize";

export const authorization = createMiddleware(async (c, next) => {
  authorize(c.get("locals"));

  await next();
});

export const provider = createMiddleware(async (c, next) => {
  const session = c.get("locals").session;
  if (!session) throw new UnauthorizedError("Session not found");

  c.set("provider", await validateProvider(session.id));

  await next();
});
