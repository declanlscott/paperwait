import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac, rbacErrorMessage } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { AccessDenied } from "../errors/application";
import { NonExhaustiveValue } from "../errors/misc";
import {
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import * as Users from "../users";
import { fn } from "../utils/shared";
import {
  createOrderMutationArgsSchema,
  deleteOrderMutationArgsSchema,
  updateOrderMutationArgsSchema,
} from "./shared";
import { ordersTable } from "./sql";

import type { Order } from "./sql";

export const create = fn(createOrderMutationArgsSchema, async (values) => {
  const { user } = useAuthenticated();

  enforceRbac(user, mutationRbac.createOrder, {
    Error: AccessDenied,
    args: [rbacErrorMessage(user, "create order mutator")],
  });

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
  const { user, tenant } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: ordersTable.id,
        rowVersion: sql<number>`"${ordersTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.tenantId, tenant.id))
      .$dynamic();

    const customerOrdersQuery = baseQuery.where(
      eq(ordersTable.customerId, user.id),
    );

    switch (user.profile.role) {
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
                eq(ordersTable.tenantId, papercutAccountsTable.tenantId),
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
                  papercutAccountsTable.tenantId,
                  papercutAccountManagerAuthorizationsTable.tenantId,
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
        throw new NonExhaustiveValue(user.profile.role);
    }
  });
}

export async function fromIds(ids: Array<Order["id"]>) {
  const { tenant } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(ordersTable)
      .where(
        and(inArray(ordersTable.id, ids), eq(ordersTable.tenantId, tenant.id)),
      ),
  );
}

export const update = fn(
  updateOrderMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, tenant } = useAuthenticated();

    const users = await Users.withOrderAccess(id);
    if (!users.some((u) => u.id === user.id))
      throw new AccessDenied(
        `User "${user.id}" cannot update order "${id}", order access denied.`,
      );

    return useTransaction(async (tx) => {
      await tx
        .update(ordersTable)
        .set(values)
        .where(
          and(eq(ordersTable.id, id), eq(ordersTable.tenantId, tenant.id)),
        );

      await afterTransaction(() =>
        Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
      );
    });
  },
);

export const delete_ = fn(
  deleteOrderMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, tenant } = useAuthenticated();

    const users = await Users.withOrderAccess(id);
    if (!users.some((u) => u.id === user.id))
      throw new AccessDenied(
        `User "${user.id}" cannot delete order "${id}", order access denied.`,
      );

    return useTransaction(async (tx) => {
      await tx
        .update(ordersTable)
        .set(values)
        .where(
          and(eq(ordersTable.id, id), eq(ordersTable.tenantId, tenant.id)),
        );

      await afterTransaction(() =>
        Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
      );
    });
  },
);

export { orderSchema as schema } from "./shared";
