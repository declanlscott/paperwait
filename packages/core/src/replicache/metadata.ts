import { and, eq, sql } from "drizzle-orm";

import { Order } from "../order/order.sql";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
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

export async function searchPapercutAccounts(tx: Transaction, user: LuciaUser) {
  const selectAll = async () =>
    await tx
      .select({ id: PapercutAccount.id, rowVersion: sql<number>`xmin` })
      .from(PapercutAccount)
      .where(eq(PapercutAccount.orgId, user.orgId));

  const selectCustomerAccounts = async () =>
    await tx
      .select({ id: PapercutAccount.id, rowVersion: sql<number>`xmin` })
      .from(PapercutAccountCustomerAuthorization)
      .innerJoin(
        User,
        and(
          eq(PapercutAccountCustomerAuthorization.customerId, User.id),
          eq(PapercutAccountCustomerAuthorization.orgId, User.orgId),
        ),
      )
      .innerJoin(
        PapercutAccount,
        and(
          eq(
            PapercutAccountCustomerAuthorization.papercutAccountId,
            PapercutAccount.id,
          ),
          eq(PapercutAccountCustomerAuthorization.orgId, PapercutAccount.orgId),
        ),
      )
      .where(eq(User.id, user.id));

  const selectManagerAccounts = async () =>
    await tx
      .select({ id: PapercutAccount.id, rowVersion: sql<number>`xmin` })
      .from(PapercutAccountManagerAuthorization)
      .innerJoin(
        User,
        and(
          eq(PapercutAccountManagerAuthorization.managerId, User.id),
          eq(PapercutAccountManagerAuthorization.orgId, User.orgId),
        ),
      )
      .innerJoin(
        PapercutAccount,
        and(
          eq(
            PapercutAccountManagerAuthorization.papercutAccountId,
            PapercutAccount.id,
          ),
          eq(PapercutAccountManagerAuthorization.orgId, PapercutAccount.orgId),
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

export async function searchPapercutAccountCustomerAuthorizations(
  tx: Transaction,
  user: LuciaUser,
) {
  const selectAll = async () =>
    await tx
      .select({
        id: PapercutAccountCustomerAuthorization.id,
        rowVersion: sql<number>`xmin`,
      })
      .from(PapercutAccountCustomerAuthorization)
      .where(eq(PapercutAccountCustomerAuthorization.orgId, user.orgId));

  const selectCustomerAuthorizations = async () =>
    await tx
      .select({
        id: PapercutAccountCustomerAuthorization.id,
        rowVersion: sql<number>`xmin`,
      })
      .from(PapercutAccountCustomerAuthorization)
      .where(
        and(
          eq(PapercutAccountCustomerAuthorization.orgId, user.orgId),
          eq(PapercutAccountCustomerAuthorization.customerId, user.id),
        ),
      );

  return searchAsRole(user.role, {
    searchAsAdministrator: selectAll,
    searchAsTechnician: selectAll,
    searchAsManager: selectCustomerAuthorizations,
    searchAsCustomer: selectCustomerAuthorizations,
  });
}

export async function searchPapercutAccountManagerAuthorizations(
  tx: Transaction,
  user: LuciaUser,
) {
  const selectAll = async () =>
    await tx
      .select({
        id: PapercutAccountManagerAuthorization.id,
        rowVersion: sql<number>`xmin`,
      })
      .from(PapercutAccountManagerAuthorization)
      .where(eq(PapercutAccountManagerAuthorization.orgId, user.orgId));

  return searchAsRole(user.role, {
    searchAsAdministrator: selectAll,
    searchAsTechnician: selectAll,
    searchAsManager: async () =>
      await tx
        .select({
          id: PapercutAccountManagerAuthorization.id,
          rowVersion: sql<number>`xmin`,
        })
        .from(PapercutAccountManagerAuthorization)
        .where(
          and(
            eq(PapercutAccountManagerAuthorization.orgId, user.orgId),
            eq(PapercutAccountManagerAuthorization.managerId, user.id),
          ),
        ),
    searchAsCustomer: async () => [],
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
