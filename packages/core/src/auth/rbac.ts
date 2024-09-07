import type { Authenticated } from ".";
import type { ApplicationError } from "../errors/application";
import type { HttpError } from "../errors/http";
import type { MutationName } from "../replicache";
import type { UserRole } from "../users/shared";

export function enforceRbac<TCustomError extends HttpError | ApplicationError>(
  user: Authenticated["user"],
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
