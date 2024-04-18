import { ForbiddenError, UnauthorizedError } from "@paperwait/core/utils/error";

import type { UserRole } from "@paperwait/core/auth/user.sql";
import type { APIContext } from "astro";

export function authorize(context: APIContext, role?: UserRole) {
  if (!context.locals.session || !context.locals.user) {
    throw new UnauthorizedError();
  }

  if (role && context.locals.user.role !== role) {
    throw new ForbiddenError();
  }

  return { user: context.locals.user, session: context.locals.session };
}
