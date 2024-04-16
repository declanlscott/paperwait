import type { User } from "lucia";
import type { UserRole } from "~/lib/server/db/schema";

export function assertRole(
  user: User,
  roleSet: Set<UserRole>,
  shouldThrow = true,
) {
  if (!roleSet.has(user.role)) {
    if (!shouldThrow) return false;

    throw new Error("User does not have permission to perform this action");
  }

  return true;
}
