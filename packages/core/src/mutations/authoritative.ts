import { and, eq } from "drizzle-orm";

import { Order } from "../order/order.sql";
import { Organization } from "../organization/organization.sql";
import { formatChannel } from "../realtime";
import { getUsersByRoles, requireAccessToOrder } from "../replicache/data";
import { assertRole } from "../user/assert";
import { User } from "../user/user.sql";
import { permissions } from "./schemas";

import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";
import type {
  CreateOrderMutationArgs,
  DeleteOrderMutationArgs,
  DeleteUserMutationArgs,
  UpdateUserRoleMutationArgs,
} from "./schemas";

export async function updateUserRole(
  tx: Transaction,
  user: LuciaUser,
  args: UpdateUserRoleMutationArgs,
) {
  assertRole(user, permissions.updateUserRole);

  const [admins] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator"]),
    tx
      .update(User)
      .set({ role: args.role })
      .where(and(eq(User.id, args.id), eq(Organization.id, user.orgId))),
  ]);

  return [
    formatChannel("user", args.id),
    ...admins.map(({ id }) => formatChannel("user", id)),
  ];
}

export async function deleteUser(
  tx: Transaction,
  user: LuciaUser,
  args: DeleteUserMutationArgs,
) {
  assertRole(user, permissions.deleteUser);

  const [admins] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator"]),
    tx
      .update(User)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(User.id, args.id), eq(Organization.id, user.orgId))),
  ]);

  return admins.map(({ id }) => formatChannel("user", id));
}

export async function createOrder(
  tx: Transaction,
  user: LuciaUser,
  args: CreateOrderMutationArgs,
) {
  assertRole(user, permissions.createOrder);

  // TODO: Get managers who have access to the order
  const [users] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "technician"]),
    tx.insert(Order).values(args),
  ]);

  return users.map(({ id }) => formatChannel("user", id));
}

export async function deleteOrder(
  tx: Transaction,
  user: LuciaUser,
  args: DeleteOrderMutationArgs,
) {
  try {
    assertRole(user, permissions.deleteOrder);
  } catch (e) {
    await requireAccessToOrder(tx, user.orgId, args.id);
  }

  // TODO: Get managers who have access to the order
  const [users] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "technician"]),
    tx
      .update(Order)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(Order.id, args.id), eq(Organization.id, user.orgId))),
  ]);

  return users.map(({ id }) => formatChannel("user", id));
}
