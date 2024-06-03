import { InvalidUserRoleError } from "../errors/application";

import type { User } from "lucia";
import type { UserRole } from "./user.sql";

export function assertRole(
  user: User,
  roles: Array<UserRole>,
  shouldThrow = true,
) {
  if (!roles.includes(user.role)) {
    if (!shouldThrow) return false;

    throw new InvalidUserRoleError();
  }

  return true;
}
