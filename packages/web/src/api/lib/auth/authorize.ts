import { ForbiddenError, UnauthorizedError } from "@paperwait/core/errors";
import { enforceRbac } from "@paperwait/core/utils";

import type { UserRole } from "@paperwait/core/user";

export function authorize(
  { user, session }: App.Locals,
  roles: Array<UserRole> = ["administrator", "operator", "manager", "customer"],
) {
  if (!session || !user) throw new UnauthorizedError();

  enforceRbac(user, roles, ForbiddenError);

  return { user, session };
}
