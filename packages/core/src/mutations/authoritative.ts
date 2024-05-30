import { and, eq } from "drizzle-orm";

import { CustomerToSharedAccount, ManagerToSharedAccount } from "../database";
import { Order } from "../order/order.sql";
import { Organization } from "../organization/organization.sql";
import { formatChannel } from "../realtime";
import { getUsersByRoles, requireAccessToOrder } from "../replicache/data";
import { SharedAccount } from "../shared-account/shared-account.sql";
import {
  syncSharedAccounts as syncSharedAccountsFn,
  syncUserSharedAccounts as syncUserSharedAccountsFn,
} from "../sync/shared-accounts";
import { assertRole } from "../user/assert";
import { User } from "../user/user.sql";
import { permissions } from "./schemas";

import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";
import type {
  CreateOrderMutationArgs,
  DeleteOrderMutationArgs,
  DeleteSharedAccountMutationArgs,
  DeleteUserMutationArgs,
  SyncSharedAccountsMutationArgs,
  SyncUserSharedAccountsMutationArgs,
  UpdateUserRoleMutationArgs,
} from "./schemas";

export async function updateUserRole(
  tx: Transaction,
  user: LuciaUser,
  args: UpdateUserRoleMutationArgs,
) {
  assertRole(user, permissions.updateUserRole);

  const [adminsTechsManagers] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "technician", "manager"]),
    tx
      .update(User)
      .set({ role: args.role })
      .where(and(eq(User.id, args.id), eq(Organization.id, user.orgId))),
  ]);

  return [
    formatChannel("user", args.id),
    ...adminsTechsManagers.map(({ id }) => formatChannel("user", id)),
  ];
}

export async function deleteUser(
  tx: Transaction,
  user: LuciaUser,
  args: DeleteUserMutationArgs,
) {
  assertRole(user, permissions.deleteUser);

  const [adminsTechsManagers] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "technician", "manager"]),
    tx
      .update(User)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(User.id, args.id), eq(Organization.id, user.orgId))),
  ]);

  return adminsTechsManagers.map(({ id }) => formatChannel("user", id));
}

export async function createOrder(
  tx: Transaction,
  user: LuciaUser,
  args: CreateOrderMutationArgs,
) {
  assertRole(user, permissions.createOrder);

  // TODO: Get managers who have access to the order
  const [adminsTechs] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "technician"]),
    tx.insert(Order).values(args),
  ]);

  return adminsTechs.map(({ id }) => formatChannel("user", id));
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
  const [adminsTechs] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "technician"]),
    tx
      .update(Order)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(Order.id, args.id), eq(Organization.id, user.orgId))),
  ]);

  return adminsTechs.map(({ id }) => formatChannel("user", id));
}

export async function syncSharedAccounts(
  tx: Transaction,
  user: LuciaUser,
  _args: SyncSharedAccountsMutationArgs,
) {
  assertRole(user, permissions.syncSharedAccounts);

  await syncSharedAccountsFn(user.orgId);

  const users = await tx
    .select({ id: User.id, username: User.username })
    .from(User)
    .where(eq(User.orgId, user.orgId));

  const [adminsTechs, customers] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "technician"]),
    ...users.map(
      async ({ id, username }) =>
        await syncUserSharedAccountsFn(user.orgId, id, username),
    ),
  ]);

  return [
    ...adminsTechs.map(({ id }) => formatChannel("user", id)),
    ...customers.map(({ id }) => formatChannel("user", id)),
  ];
}

export async function deleteSharedAccount(
  tx: Transaction,
  user: LuciaUser,
  args: DeleteSharedAccountMutationArgs,
) {
  assertRole(user, permissions.deleteSharedAccount);

  const [adminsTechs, customers, managers] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "technician"]),
    tx
      .select({ customerId: CustomerToSharedAccount.customerId })
      .from(CustomerToSharedAccount)
      .where(
        and(
          eq(CustomerToSharedAccount.sharedAccountId, args.id),
          eq(CustomerToSharedAccount.orgId, user.orgId),
        ),
      ),
    tx
      .select({ managerId: ManagerToSharedAccount.managerId })
      .from(ManagerToSharedAccount)
      .where(
        and(
          eq(ManagerToSharedAccount.sharedAccountId, args.id),
          eq(ManagerToSharedAccount.orgId, user.orgId),
        ),
      ),
    tx
      .update(SharedAccount)
      .set({ deletedAt: new Date().toISOString() })
      .where(
        and(eq(SharedAccount.id, args.id), eq(SharedAccount.orgId, user.orgId)),
      ),
  ]);

  return [
    ...adminsTechs.map(({ id }) => formatChannel("user", id)),
    ...customers.map(({ customerId }) => formatChannel("user", customerId)),
    ...managers.map(({ managerId }) => formatChannel("user", managerId)),
  ];
}

export async function syncUserSharedAccounts(
  tx: Transaction,
  user: LuciaUser,
  _args: SyncUserSharedAccountsMutationArgs,
) {
  assertRole(user, permissions.syncUserSharedAccounts);

  const [adminsTechs, customers] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "technician"]),
    syncUserSharedAccountsFn(user.orgId, user.id, user.username),
  ]);

  return [
    ...adminsTechs.map(({ id }) => formatChannel("user", id)),
    ...customers.map(({ id }) => formatChannel("user", id)),
  ];
}
