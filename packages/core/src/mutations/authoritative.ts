import { and, eq } from "drizzle-orm";

import { Order } from "../order/order.sql";
import { Organization } from "../organization/organization.sql";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
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
  DeletePapercutAccountMutationArgs,
  DeleteUserMutationArgs,
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

export async function deletePapercutAccount(
  tx: Transaction,
  user: LuciaUser,
  args: DeletePapercutAccountMutationArgs,
) {
  assertRole(user, permissions.deletePapercutAccount);

  const [adminsTechs, customers, managers] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "technician"]),
    tx
      .select({ customerId: PapercutAccountCustomerAuthorization.customerId })
      .from(PapercutAccountCustomerAuthorization)
      .where(
        and(
          eq(PapercutAccountCustomerAuthorization.papercutAccountId, args.id),
          eq(PapercutAccountCustomerAuthorization.orgId, user.orgId),
        ),
      ),
    tx
      .select({ managerId: PapercutAccountManagerAuthorization.managerId })
      .from(PapercutAccountManagerAuthorization)
      .where(
        and(
          eq(PapercutAccountManagerAuthorization.papercutAccountId, args.id),
          eq(PapercutAccountManagerAuthorization.orgId, user.orgId),
        ),
      ),
    tx
      .update(PapercutAccount)
      .set({ deletedAt: new Date().toISOString() })
      .where(
        and(
          eq(PapercutAccount.id, args.id),
          eq(PapercutAccount.orgId, user.orgId),
        ),
      ),
  ]);

  return [
    ...adminsTechs.map(({ id }) => formatChannel("user", id)),
    ...customers.map(({ customerId }) => formatChannel("user", customerId)),
    ...managers.map(({ managerId }) => formatChannel("user", managerId)),
  ];
}
