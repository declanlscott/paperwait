import { and, arrayOverlaps, eq, inArray, isNull, sql } from "drizzle-orm";

import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ordersTable } from "../orders/sql";
import {
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { useAuthenticated } from "../sessions/context";
import { Users } from "../users";
import { Constants } from "../utils/constants";
import { ApplicationError, MiscellaneousError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  createCommentMutationArgsSchema,
  deleteCommentMutationArgsSchema,
  updateCommentMutationArgsSchema,
} from "./shared";
import { commentsTable } from "./sql";

import type { Comment } from "./sql";

export namespace Comments {
  export const create = fn(createCommentMutationArgsSchema, async (values) => {
    const { user } = useAuthenticated();

    const users = await Users.withOrderAccess(values.orderId);
    if (!users.some((u) => u.id === user.id))
      throw new ApplicationError.AccessDenied(
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
          rowVersion: sql<number>`"${commentsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}`,
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
          throw new MiscellaneousError.NonExhaustiveValue(user.profile.role);
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
        throw new ApplicationError.AccessDenied(
          `User "${user.id}" cannot update comment "${id}" on order "${values.orderId}", order access denied.`,
        );

      return useTransaction(async (tx) => {
        await tx
          .update(commentsTable)
          .set(values)
          .where(
            and(
              eq(commentsTable.id, id),
              eq(commentsTable.tenantId, tenant.id),
            ),
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
    deleteCommentMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      const users = await Users.withOrderAccess(values.orderId);
      if (!users.some((u) => u.id === user.id))
        throw new ApplicationError.AccessDenied(
          `User "${user.id}" cannot delete comment "${id}" on order "${values.orderId}", order access denied.`,
        );

      return useTransaction(async (tx) => {
        await tx
          .update(commentsTable)
          .set(values)
          .where(
            and(
              eq(commentsTable.id, id),
              eq(commentsTable.tenantId, tenant.id),
            ),
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
