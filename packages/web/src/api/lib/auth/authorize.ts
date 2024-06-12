import { ForbiddenError, UnauthorizedError } from "@paperwait/core/errors";
import { assertRole } from "@paperwait/core/user";

import type { UserRole } from "@paperwait/core/user";

export function authorize(
  { user, session }: App.Locals,
  roleSet: Array<UserRole> = [
    "administrator",
    "operator",
    "manager",
    "customer",
  ],
) {
  if (!session || !user) throw new UnauthorizedError();

  if (!assertRole(user, roleSet, false)) throw new ForbiddenError();

  return { user, session };
}
