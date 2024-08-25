import type { LuciaUser } from "../auth";
import type { UserRole } from "../constants/tuples";
import type { ApplicationError } from "../errors/application";
import type { HttpError } from "../errors/http";

export function enforceRbac<TCustomError extends HttpError | ApplicationError>(
  user: LuciaUser,
  roles: Array<UserRole>,
  CustomError?: new () => TCustomError,
) {
  const hasAccess = roles.includes(user.role);

  if (!hasAccess) {
    console.log(`Role-based access control failed for user id "${user.id}".`);

    if (CustomError) throw new CustomError();
  }

  return hasAccess;
}
