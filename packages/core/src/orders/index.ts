import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { afterTransaction, useTransaction } from "../drizzle/transaction";
import {
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { mutationRbac } from "../replicache/shared";
import { useAuthenticated } from "../sessions/context";
import { Users } from "../users";
import { Constants } from "../utils/constants";
import { ApplicationError, MiscellaneousError } from "../utils/errors";
import { enforceRbac, fn, rbacErrorMessage } from "../utils/shared";
import {
  createOrderMutationArgsSchema,
  deleteOrderMutationArgsSchema,
  updateOrderMutationArgsSchema,
} from "./shared";
import { ordersTable } from "./sql";

import type { Order } from "./sql";

export namespace Orders {
  export const create = fn(createOrderMutationArgsSchema, async (values) => {
    const { user } = useAuthenticated();

    enforceRbac(user, mutationRbac.createOrder, {
      Error: ApplicationError.AccessDenied,
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
          usersToPoke.map((u) => Realtime.formatChannel("user", u.id)),
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
          rowVersion: sql<number>`"${ordersTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.tenantId, tenant.id),
            isNull(ordersTable.deletedAt),
          ),
        )
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
          throw new MiscellaneousError.NonExhaustiveValue(user.profile.role);
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
          and(
            inArray(ordersTable.id, ids),
            eq(ordersTable.tenantId, tenant.id),
          ),
        ),
    );
  }

  export const update = fn(
    updateOrderMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      const users = await Users.withOrderAccess(id);
      if (!users.some((u) => u.id === user.id))
        throw new ApplicationError.AccessDenied(
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
          Replicache.poke(
            users.map((u) => Realtime.formatChannel("user", u.id)),
          ),
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
        throw new ApplicationError.AccessDenied(
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
          Replicache.poke(
            users.map((u) => Realtime.formatChannel("user", u.id)),
          ),
        );
      });
    },
  );
}
