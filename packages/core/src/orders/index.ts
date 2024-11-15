import { and, eq, inArray } from "drizzle-orm";

import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { Permissions } from "../permissions";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { useAuthenticated } from "../sessions/context";
import { Users } from "../users";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  createOrderMutationArgsSchema,
  deleteOrderMutationArgsSchema,
  updateOrderMutationArgsSchema,
} from "./shared";
import { ordersTable } from "./sql";

import type { Order } from "./sql";

export namespace Orders {
  export const create = fn(createOrderMutationArgsSchema, async (values) => {
    const hasAccess = await Permissions.hasAccess(
      ordersTable._.name,
      "create",
      values.papercutAccountId,
    );
    if (!hasAccess)
      throw new ApplicationError.AccessDenied({ name: ordersTable._.name });

    return useTransaction(async (tx) => {
      const order = await tx
        .insert(ordersTable)
        .values(values)
        .returning({ id: ordersTable.id })
        .then((rows) => rows.at(0));
      if (!order) throw new Error("Failed to insert order");

      const users = await Users.withOrderAccess(order.id);

      await afterTransaction(() =>
        Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
      );
    });
  });

  export const read = async (ids: Array<Order["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(ordersTable)
        .where(
          and(
            inArray(ordersTable.id, ids),
            eq(ordersTable.tenantId, useAuthenticated().tenant.id),
          ),
        ),
    );

  export const update = fn(
    updateOrderMutationArgsSchema,
    async ({ id, ...values }) => {
      const hasAccess = await Permissions.hasAccess(
        ordersTable._.name,
        "update",
        id,
      );
      if (!hasAccess)
        throw new ApplicationError.AccessDenied({
          name: ordersTable._.name,
          id,
        });

      return useTransaction(async (tx) => {
        const [users] = await Promise.all([
          Users.withOrderAccess(id),
          tx
            .update(ordersTable)
            .set(values)
            .where(
              and(
                eq(ordersTable.id, id),
                eq(ordersTable.tenantId, useAuthenticated().tenant.id),
              ),
            ),
        ]);

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
      const hasAccess = await Permissions.hasAccess(
        ordersTable._.name,
        "delete",
        id,
      );
      if (!hasAccess)
        throw new ApplicationError.AccessDenied({
          name: ordersTable._.name,
          id,
        });

      return useTransaction(async (tx) => {
        const [users] = await Promise.all([
          Users.withOrderAccess(id),
          tx
            .update(ordersTable)
            .set(values)
            .where(
              and(
                eq(ordersTable.id, id),
                eq(ordersTable.tenantId, useAuthenticated().tenant.id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          Replicache.poke(
            users.map((u) => Realtime.formatChannel("user", u.id)),
          ),
        );
      });
    },
  );
}
