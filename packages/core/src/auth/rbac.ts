import type { Authenticated } from ".";
import type { MutationName } from "../replicache";
import type { UserRole } from "../users/shared";
import type { AnyError, CustomError, InferCustomError } from "../utils/types";

export const rbacErrorMessage = (
  user: Authenticated["user"],
  resourceName?: string,
) =>
  `User "${user.id}" does not have the required role to access ${resourceName ? `"${resourceName}"` : "this resource"}.`;

export type EnforceRbacResult<TMaybeError extends AnyError | undefined> =
  TMaybeError extends AnyError ? true : boolean;

export function enforceRbac<TMaybeError extends AnyError | undefined>(
  user: Authenticated["user"],
  roles: Array<UserRole>,
  customError?: TMaybeError extends AnyError
    ? InferCustomError<CustomError<TMaybeError>>
    : never,
): EnforceRbacResult<TMaybeError> {
  const hasAccess = roles.includes(user.role);

  if (!hasAccess) {
    console.log(rbacErrorMessage(user));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (customError) throw new customError.Error(...customError.args);
  }

  return hasAccess as EnforceRbacResult<TMaybeError>;
}

/**
 * Role-based access control for mutations.
 */
export const mutationRbac = {
  createAnnouncement: ["administrator", "operator"],
  updateAnnouncement: ["administrator", "operator"],
  deleteAnnouncement: ["administrator", "operator"],
  createComment: ["administrator", "operator"],
  updateComment: ["administrator"],
  deleteComment: ["administrator"],
  createOrder: ["administrator", "operator", "manager", "customer"],
  updateOrder: ["administrator", "operator"],
  deleteOrder: ["administrator", "operator"],
  updateOrganization: ["administrator"],
  deletePapercutAccount: ["administrator"],
  createPapercutAccountManagerAuthorization: ["administrator"],
  deletePapercutAccountManagerAuthorization: ["administrator"],
  createProduct: ["administrator", "operator"],
  updateProduct: ["administrator", "operator"],
  deleteProduct: ["administrator", "operator"],
  createRoom: ["administrator"],
  updateRoom: ["administrator", "operator"],
  deleteRoom: ["administrator"],
  restoreRoom: ["administrator"],
  updateUserRole: ["administrator"],
  deleteUser: ["administrator"],
  restoreUser: ["administrator"],
} as const satisfies Record<MutationName, Array<UserRole>>;
