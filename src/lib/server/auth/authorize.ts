import { ForbiddenError, UnauthorizedError } from "~/lib/server/error";

import type { APIContext } from "astro";
import type { UserRole } from "~/lib/server/db/schema";

export function authorize(context: APIContext, role?: UserRole) {
  if (!context.locals.session || !context.locals.user) {
    throw new UnauthorizedError();
  }

  if (role && context.locals.user.role !== role) {
    throw new ForbiddenError();
  }

  return { user: context.locals.user, session: context.locals.session };
}
