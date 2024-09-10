import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ForbiddenError } from "../errors/http";
import { NonExhaustiveValueError } from "../errors/misc";
import {
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import * as Users from "../users";
import { fn } from "../utils/helpers";
import {
  createOrderMutationArgsSchema,
  deleteOrderMutationArgsSchema,
  updateOrderMutationArgsSchema,
} from "./shared";
import { ordersTable } from "./sql";

import type { Order } from "./sql";

export const create = fn(createOrderMutationArgsSchema, async (values) => {
  const { user } = useAuthenticated();

  enforceRbac(user, mutationRbac.createOrder, ForbiddenError);

  return useTransaction(async (tx) => {
    const order = await tx
      .insert(ordersTable)
      .values(values)
      .returning({ id: ordersTable.id })
      .then((rows) => rows.at(0));
    if (!order) throw new Error("Failed to insert order");

    const usersToPoke = await Users.withOrderAccess(order.id);
    await afterTransaction(() =>
      Replicache.poke(
        usersToPoke.map(({ id }) => Realtime.formatChannel("user", id)),
      ),
    );
  });
});

export async function metadata() {
  const { org, user } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: ordersTable.id,
        rowVersion: sql<number>`"${ordersTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.orgId, org.id))
      .$dynamic();

    const customerOrdersQuery = baseQuery.where(
      eq(ordersTable.customerId, user.id),
    );

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "operator":
        return baseQuery.where(isNull(ordersTable.deletedAt));
      case "manager": {
        const [customerOrders, managerOrders] = await Promise.all([
          customerOrdersQuery,
          baseQuery
            .innerJoin(
              papercutAccountsTable,
              and(
                eq(ordersTable.papercutAccountId, papercutAccountsTable.id),
                eq(ordersTable.orgId, papercutAccountsTable.orgId),
              ),
            )
            .innerJoin(
              papercutAccountManagerAuthorizationsTable,
              and(
                eq(
                  papercutAccountsTable.id,
                  papercutAccountManagerAuthorizationsTable.papercutAccountId,
                ),
                eq(
                  papercutAccountsTable.orgId,
                  papercutAccountManagerAuthorizationsTable.orgId,
                ),
              ),
            )
            .where(isNull(ordersTable.deletedAt)),
        ]);

        return [...customerOrders, ...managerOrders];
      }
      case "customer":
        return customerOrdersQuery;
      default:
        throw new NonExhaustiveValueError(user.role);
    }
  });
}

export async function fromIds(ids: Array<Order["id"]>) {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(ordersTable)
      .where(and(inArray(ordersTable.id, ids), eq(ordersTable.orgId, org.id))),
  );
}

export const update = fn(
  updateOrderMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    const users = await Users.withOrderAccess(id);
    if (!users.some((u) => u.id === user.id))
      throw new ForbiddenError(
        `User "${user.id}" cannot update order "${id}" because they do not have access to that order.`,
      );

    return useTransaction(async (tx) => {
      await tx
        .update(ordersTable)
        .set(values)
        .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, org.id)));

      await afterTransaction(() =>
        Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
      );
    });
  },
);

export const delete_ = fn(
  deleteOrderMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    const users = await Users.withOrderAccess(id);
    if (!users.some((u) => u.id === user.id))
      throw new ForbiddenError(
        `User "${user.id}" cannot delete order "${id}", order access forbidden.`,
      );

    return useTransaction(async (tx) => {
      await tx
        .update(ordersTable)
        .set(values)
        .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, org.id)));

      await afterTransaction(() =>
        Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
      );
    });
  },
);

export { orderSchema as schema } from "./shared";
