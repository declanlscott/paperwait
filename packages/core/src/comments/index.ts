import { and, arrayOverlaps, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { AccessDenied } from "../errors/application";
import { NonExhaustiveValue } from "../errors/misc";
import { ordersTable } from "../orders/sql";
import {
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import * as Users from "../users";
import { fn } from "../utils/helpers";
import {
  createCommentMutationArgsSchema,
  deleteCommentMutationArgsSchema,
  updateCommentMutationArgsSchema,
} from "./shared";
import { commentsTable } from "./sql";

import type { Comment } from "./sql";

export const create = fn(createCommentMutationArgsSchema, async (values) => {
  const { user } = useAuthenticated();

  const users = await Users.withOrderAccess(values.orderId);
  if (!users.some((u) => u.id === user.id))
    throw new AccessDenied(
      `User "${user.id}" cannot create a comment on order "${values.orderId}", order access denied.`,
    );

  return useTransaction(async (tx) => {
    await tx.insert(commentsTable).values(values);

    await afterTransaction(() =>
      Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
    );
  });
});

export async function metadata() {
  const { user, tenant } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: commentsTable.id,
        rowVersion: sql<number>`"${commentsTable._.name}"."${ROW_VERSION_COLUMN_NAME}`,
      })
      .from(commentsTable)
      .where(eq(commentsTable.tenantId, tenant.id))
      .$dynamic();

    switch (user.profile.role) {
      case "administrator":
        return baseQuery;
      case "operator":
        return baseQuery.where(
          and(
            arrayOverlaps(commentsTable.visibleTo, [
              "operator",
              "manager",
              "customer",
            ]),
            isNull(commentsTable.deletedAt),
          ),
        );
      case "manager":
        return baseQuery
          .innerJoin(
            ordersTable,
            and(
              eq(commentsTable.orderId, ordersTable.id),
              eq(commentsTable.tenantId, ordersTable.tenantId),
            ),
          )
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
          .where(
            and(
              arrayOverlaps(commentsTable.visibleTo, ["manager", "customer"]),
              isNull(commentsTable.deletedAt),
            ),
          );
      case "customer":
        return baseQuery
          .innerJoin(
            ordersTable,
            and(
              eq(commentsTable.orderId, ordersTable.id),
              eq(commentsTable.tenantId, ordersTable.tenantId),
            ),
          )
          .where(
            and(
              eq(ordersTable.customerId, user.id),
              arrayOverlaps(commentsTable.visibleTo, ["customer"]),
              isNull(commentsTable.deletedAt),
            ),
          );
      default:
        throw new NonExhaustiveValue(user.profile.role);
    }
  });
}

export async function fromIds(ids: Array<Comment["id"]>) {
  const { tenant } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(commentsTable)
      .where(
        and(
          inArray(commentsTable.id, ids),
          eq(commentsTable.tenantId, tenant.id),
        ),
      ),
  );
}

export const update = fn(
  updateCommentMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, tenant } = useAuthenticated();

    const users = await Users.withOrderAccess(values.orderId);
    if (!users.some((u) => u.id === user.id))
      throw new AccessDenied(
        `User "${user.id}" cannot update comment "${id}" on order "${values.orderId}", order access denied.`,
      );

    return useTransaction(async (tx) => {
      await tx
        .update(commentsTable)
        .set(values)
        .where(
          and(eq(commentsTable.id, id), eq(commentsTable.tenantId, tenant.id)),
        );

      await afterTransaction(() =>
        Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
      );
    });
  },
);

export const delete_ = fn(
  deleteCommentMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, tenant } = useAuthenticated();

    const users = await Users.withOrderAccess(values.orderId);
    if (!users.some((u) => u.id === user.id))
      throw new AccessDenied(
        `User "${user.id}" cannot delete comment "${id}" on order "${values.orderId}", order access denied.`,
      );

    return useTransaction(async (tx) => {
      await tx
        .update(commentsTable)
        .set(values)
        .where(
          and(eq(commentsTable.id, id), eq(commentsTable.tenantId, tenant.id)),
        );

      await afterTransaction(() =>
        Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
      );
    });
  },
);

export { commentSchema as schema } from "./shared";
