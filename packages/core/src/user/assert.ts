import type { User } from "lucia";
import type { ApplicationError } from "../errors/application";
import type { HttpError } from "../errors/http";
import type { UserRole } from "./user.sql";

export function assertRole<TCustomError extends HttpError | ApplicationError>(
  user: User,
  roles: Array<UserRole>,
  CustomError?: new () => TCustomError,
) {
  if (!roles.includes(user.role)) {
    console.warn(`Role assertion failed for user id "${user.id}".`);

    if (!CustomError) return false;

    throw new CustomError();
  }

  return true;
}
