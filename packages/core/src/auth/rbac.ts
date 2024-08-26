import type { LuciaUser } from ".";
import type { UserRole } from "../constants/tuples";
import type { ApplicationError } from "../errors/application";
import type { HttpError } from "../errors/http";
import type { Mutation } from "../replicache/schemas";

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

/**
 * Role-based access control for mutators.
 */
export const mutatorRbac = {
  updateOrganization: ["administrator"],
  updateUserRole: ["administrator"],
  deleteUser: ["administrator"],
  restoreUser: ["administrator"],
  syncPapercutAccounts: ["administrator"],
  deletePapercutAccount: ["administrator"],
  createPapercutAccountManagerAuthorization: ["administrator"],
  deletePapercutAccountManagerAuthorization: ["administrator"],
  createRoom: ["administrator"],
  updateRoom: ["administrator", "operator"],
  deleteRoom: ["administrator"],
  restoreRoom: ["administrator"],
  createAnnouncement: ["administrator", "operator"],
  updateAnnouncement: ["administrator", "operator"],
  deleteAnnouncement: ["administrator", "operator"],
  createProduct: ["administrator", "operator"],
  updateProduct: ["administrator", "operator"],
  deleteProduct: ["administrator", "operator"],
  createOrder: ["administrator", "operator", "manager", "customer"],
  updateOrder: ["administrator", "operator"],
  deleteOrder: ["administrator", "operator"],
  createComment: ["administrator", "operator"],
  updateComment: ["administrator"],
  deleteComment: ["administrator"],
} as const satisfies Record<Mutation["name"], Array<UserRole>>;
