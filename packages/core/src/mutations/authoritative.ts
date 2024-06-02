import { and, eq } from "drizzle-orm";

import { ApplicationError } from "../errors";
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
  CreatePapercutAccountManagerAuthorizationMutationArgs,
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

  const [adminsOpsManagers] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "operator", "manager"]),
    tx
      .update(User)
      .set({ role: args.role })
      .where(and(eq(User.id, args.id), eq(Organization.id, user.orgId))),
  ]);

  return [
    formatChannel("user", args.id),
    ...adminsOpsManagers.map(({ id }) => formatChannel("user", id)),
  ];
}

export async function deleteUser(
  tx: Transaction,
  user: LuciaUser,
  args: DeleteUserMutationArgs,
) {
  assertRole(user, permissions.deleteUser);

  const [adminsOpsManagers] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "operator", "manager"]),
    tx
      .update(User)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(User.id, args.id), eq(Organization.id, user.orgId))),
  ]);

  return adminsOpsManagers.map(({ id }) => formatChannel("user", id));
}

export async function createOrder(
  tx: Transaction,
  user: LuciaUser,
  args: CreateOrderMutationArgs,
) {
  assertRole(user, permissions.createOrder);

  const [order] = await tx
    .insert(Order)
    .values(args)
    .returning({ id: Order.id });

  const [adminsOps, managers] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "operator"]),
    tx
      .select({ id: User.id })
      .from(User)
      .innerJoin(
        PapercutAccountManagerAuthorization,
        and(
          eq(User.id, PapercutAccountManagerAuthorization.managerId),
          eq(User.orgId, PapercutAccountManagerAuthorization.orgId),
        ),
      )
      .innerJoin(
        PapercutAccount,
        and(
          eq(
            PapercutAccountManagerAuthorization.papercutAccountId,
            PapercutAccount.id,
          ),
          eq(PapercutAccount.orgId, PapercutAccountManagerAuthorization.orgId),
        ),
      )
      .innerJoin(
        Order,
        and(
          eq(PapercutAccount.id, Order.papercutAccountId),
          eq(PapercutAccount.orgId, Order.orgId),
        ),
      )
      .where(and(eq(Order.id, order.id), eq(Order.orgId, user.orgId))),
  ]);

  return [
    ...adminsOps.map(({ id }) => formatChannel("user", id)),
    ...managers.map(({ id }) => formatChannel("user", id)),
  ];
}

export async function deleteOrder(
  tx: Transaction,
  user: LuciaUser,
  args: DeleteOrderMutationArgs,
) {
  try {
    assertRole(user, permissions.deleteOrder);
  } catch (e) {
    let errorHandled = false;

    if (e instanceof ApplicationError) {
      errorHandled = true;
      await requireAccessToOrder(tx, user, args.id);
    }

    if (!errorHandled) throw e;
  }

  const [adminsOps, managers, [customer]] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "operator"]),
    tx
      .select({ id: User.id })
      .from(User)
      .innerJoin(
        PapercutAccountManagerAuthorization,
        and(
          eq(User.id, PapercutAccountManagerAuthorization.managerId),
          eq(User.orgId, PapercutAccountManagerAuthorization.orgId),
        ),
      )
      .innerJoin(
        PapercutAccount,
        and(
          eq(
            PapercutAccountManagerAuthorization.papercutAccountId,
            PapercutAccount.id,
          ),
          eq(PapercutAccount.orgId, PapercutAccountManagerAuthorization.orgId),
        ),
      )
      .innerJoin(
        Order,
        and(
          eq(PapercutAccount.id, Order.papercutAccountId),
          eq(PapercutAccount.orgId, Order.orgId),
        ),
      )
      .where(and(eq(Order.id, args.id), eq(Order.orgId, user.orgId))),
    tx
      .select({ id: User.id })
      .from(User)
      .innerJoin(Order, eq(User.id, Order.customerId))
      .where(and(eq(Order.id, args.id), eq(Order.orgId, user.orgId))),
    tx
      .update(Order)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(Order.id, args.id), eq(Organization.id, user.orgId))),
  ]);

  return [
    ...adminsOps.map(({ id }) => formatChannel("user", id)),
    ...managers.map(({ id }) => formatChannel("user", id)),
    formatChannel("user", customer.id),
  ];
}

export async function deletePapercutAccount(
  tx: Transaction,
  user: LuciaUser,
  args: DeletePapercutAccountMutationArgs,
) {
  assertRole(user, permissions.deletePapercutAccount);

  const [adminsOps, managers, customers] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "operator"]),
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
      .select({ customerId: PapercutAccountCustomerAuthorization.customerId })
      .from(PapercutAccountCustomerAuthorization)
      .where(
        and(
          eq(PapercutAccountCustomerAuthorization.papercutAccountId, args.id),
          eq(PapercutAccountCustomerAuthorization.orgId, user.orgId),
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
    ...adminsOps.map(({ id }) => formatChannel("user", id)),
    ...customers.map(({ customerId }) => formatChannel("user", customerId)),
    ...managers.map(({ managerId }) => formatChannel("user", managerId)),
  ];
}

export async function createPapercutAccountManagerAuthorization(
  tx: Transaction,
  user: LuciaUser,
  args: CreatePapercutAccountManagerAuthorizationMutationArgs,
) {
  assertRole(user, permissions.createPapercutAccountManagerAuthorization);

  const [managerAuthorization] = await tx
    .insert(PapercutAccountManagerAuthorization)
    .values(args)
    .onConflictDoNothing()
    .returning({ id: PapercutAccountManagerAuthorization.id });

  if (!managerAuthorization) return [];

  return [];
}
