import type { User } from "lucia";
import type { UserRole } from "./user.sql";

export function assertRole(
  user: User,
  roleSet: Array<UserRole>,
  shouldThrow = true,
) {
  if (!roleSet.includes(user.role)) {
    if (!shouldThrow) return false;

    throw new Error("User does not have permission to perform this action");
  }

  return true;
}
