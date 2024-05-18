import { and, eq, sql } from "drizzle-orm";

import { Order } from "../order";
import { User } from "../user";
import { ReplicacheClient } from "./replicache.sql";

import type { LuciaUser } from "../auth";
import type { Transaction } from "../database";

export type Metadata = {
  id: string;
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
