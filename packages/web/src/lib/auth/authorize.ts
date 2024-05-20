import { ForbiddenError, UnauthorizedError } from "@paperwait/core/errors";
import { assertRole } from "@paperwait/core/user";

import type { UserRole } from "@paperwait/core/user";
import type { APIContext } from "astro";

export function authorize(
  context: APIContext,
  roleSet: Array<UserRole> = [
    "administrator",
    "technician",
    "manager",
    "customer",
  ],
) {
  if (!context.locals.session || !context.locals.user) {
    throw new UnauthorizedError();
  }

  if (!assertRole(context.locals.user, roleSet, false)) {
    throw new ForbiddenError();
  }

  return { user: context.locals.user, session: context.locals.session };
}
