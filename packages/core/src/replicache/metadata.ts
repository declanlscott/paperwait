import { and, eq, sql } from "drizzle-orm";

import {
  CustomerToSharedAccount,
  ManagerToSharedAccount,
} from "../database/relations.sql";
import { Order } from "../order/order.sql";
import { SharedAccount } from "../shared-account/shared-account.sql";
import { User } from "../user/user.sql";
import { ReplicacheClient } from "./replicache.sql";

import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";

export type Metadata = {
  id: string | number;
  rowVersion: number;
};

export async function searchClients(
  tx: Transaction,
  clientGroupId: ReplicacheClient["clientGroupId"],
) {
  return await tx
    .select({
      id: ReplicacheClient.id,
      rowVersion: ReplicacheClient.lastMutationId,
    })
    .from(ReplicacheClient)
    .where(eq(ReplicacheClient.clientGroupId, clientGroupId));
}

export async function searchUsers(tx: Transaction, user: LuciaUser) {
  const selectSelf = async () =>
    await tx
      .select({ id: User.id, rowVersion: sql<number>`xmin` })
      .from(User)
      .where(eq(User.id, user.id));

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select({ id: User.id, rowVersion: sql<number>`xmin` })
        .from(User)
        .where(eq(User.orgId, user.orgId)),
    searchAsTechnician: selectSelf,
    searchAsManager: selectSelf,
    searchAsCustomer: selectSelf,
  });
}

export async function searchOrders(tx: Transaction, user: LuciaUser) {
  const selectAll = async () =>
    await tx
      .select({ id: Order.id, rowVersion: sql<number>`xmin` })
      .from(Order)
      .where(eq(Order.orgId, user.orgId));

  return searchAsRole(user.role, {
    searchAsAdministrator: selectAll,
    searchAsTechnician: selectAll,
    searchAsManager: async () => [],
    searchAsCustomer: async () =>
      await tx
        .select({ id: Order.id, rowVersion: sql<number>`xmin` })
        .from(Order)
        .where(and(eq(Order.orgId, user.orgId), eq(Order.customerId, user.id))),
  });
}

export async function searchSharedAccounts(tx: Transaction, user: LuciaUser) {
  const selectAll = async () =>
    await tx
      .select({ id: SharedAccount.id, rowVersion: sql<number>`xmin` })
      .from(SharedAccount);

  const selectCustomerAccounts = async () =>
    await tx
      .select({ id: SharedAccount.id, rowVersion: sql<number>`xmin` })
      .from(CustomerToSharedAccount)
      .innerJoin(
        User,
        and(
          eq(CustomerToSharedAccount.customerId, User.id),
          eq(CustomerToSharedAccount.orgId, User.orgId),
        ),
      )
      .innerJoin(
        SharedAccount,
        and(
          eq(CustomerToSharedAccount.sharedAccountId, SharedAccount.id),
          eq(CustomerToSharedAccount.orgId, SharedAccount.orgId),
        ),
      )
      .where(eq(User.id, user.id));

  const selectManagerAccounts = async () =>
    await tx
      .select({ id: SharedAccount.id, rowVersion: sql<number>`xmin` })
      .from(ManagerToSharedAccount)
      .innerJoin(
        User,
        and(
          eq(ManagerToSharedAccount.managerId, User.id),
          eq(ManagerToSharedAccount.orgId, User.orgId),
        ),
      )
      .innerJoin(
        SharedAccount,
        and(
          eq(ManagerToSharedAccount.sharedAccountId, SharedAccount.id),
          eq(ManagerToSharedAccount.orgId, SharedAccount.orgId),
        ),
      )
      .where(eq(User.id, user.id));

  return searchAsRole(user.role, {
    searchAsAdministrator: selectAll,
    searchAsTechnician: selectAll,
    searchAsManager: async () => {
      const [customerAccounts, managerAccounts] = await Promise.all([
        selectCustomerAccounts(),
        selectManagerAccounts(),
      ]);

      return Array.from(new Set([...customerAccounts, ...managerAccounts]));
    },
    searchAsCustomer: selectCustomerAccounts,
  });
}

async function searchAsRole(
  role: LuciaUser["role"],
  callbacks: Record<
    `searchAs${Capitalize<LuciaUser["role"]>}`,
    () => Promise<Array<Metadata>>
  >,
) {
  switch (role) {
    case "administrator":
      return callbacks.searchAsAdministrator();
    case "technician":
      return callbacks.searchAsTechnician();
    case "manager":
      return callbacks.searchAsManager();
    case "customer":
      return callbacks.searchAsCustomer();
    default:
      role satisfies never;
      return [];
  }
}
