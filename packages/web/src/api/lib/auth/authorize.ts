import { ForbiddenError, UnauthorizedError } from "@paperwait/core/errors";
import { assertRole } from "@paperwait/core/user";

import type { UserRole } from "@paperwait/core/user";

export function authorize(
  locals: App.Locals,
  roleSet: Array<UserRole> = [
    "administrator",
    "operator",
    "manager",
    "customer",
  ],
) {
  if (!locals.session || !locals.user) throw new UnauthorizedError();

  if (!assertRole(locals.user, roleSet, false)) throw new ForbiddenError();

  return { user: locals.user, session: locals.session };
}
