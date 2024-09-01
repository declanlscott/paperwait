import { and, arrayOverlaps, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ForbiddenError } from "../errors/http";
import { NonExhaustiveValueError } from "../errors/misc";
import { orders } from "../orders/sql";
import {
  papercutAccountManagerAuthorizations,
  papercutAccounts,
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
import { comments } from "./sql";

import type { Comment } from "./sql";

export const create = fn(createCommentMutationArgsSchema, async (values) => {
  const { user } = useAuthenticated();

  const users = await Users.withOrderAccess(values.orderId);
  if (!users.some((u) => u.id === user.id))
    throw new ForbiddenError(
      `User "${user.id}" cannot create a comment on order "${values.orderId}", order access forbidden.`,
    );

  return useTransaction(async (tx) => {
    await tx.insert(comments).values(values);

    await afterTransaction(() =>
      Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
    );
  });
});

export async function metadata() {
  const { user, org } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: comments.id,
        rowVersion: sql<number>`"${comments._.name}"."${ROW_VERSION_COLUMN_NAME}`,
      })
      .from(comments)
      .where(eq(comments.orgId, org.id))
      .$dynamic();

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "operator":
        return baseQuery.where(
          and(
            arrayOverlaps(comments.visibleTo, [
              "operator",
              "manager",
              "customer",
            ]),
            isNull(comments.deletedAt),
          ),
        );
      case "manager":
        return baseQuery
          .innerJoin(
            orders,
            and(
              eq(comments.orderId, orders.id),
              eq(comments.orgId, orders.orgId),
            ),
          )
          .innerJoin(
            papercutAccounts,
            and(
              eq(orders.papercutAccountId, papercutAccounts.id),
              eq(orders.orgId, papercutAccounts.orgId),
            ),
          )
          .innerJoin(
            papercutAccountManagerAuthorizations,
            and(
              eq(
                papercutAccounts.id,
                papercutAccountManagerAuthorizations.papercutAccountId,
              ),
              eq(
                papercutAccounts.orgId,
                papercutAccountManagerAuthorizations.orgId,
              ),
            ),
          )
          .where(
            and(
              arrayOverlaps(comments.visibleTo, ["manager", "customer"]),
              isNull(comments.deletedAt),
            ),
          );
      case "customer":
        return baseQuery
          .innerJoin(
            orders,
            and(
              eq(comments.orderId, orders.id),
              eq(comments.orgId, orders.orgId),
            ),
          )
          .where(
            and(
              eq(orders.customerId, user.id),
              arrayOverlaps(comments.visibleTo, ["customer"]),
              isNull(comments.deletedAt),
            ),
          );
      default:
        throw new NonExhaustiveValueError(user.role);
    }
  });
}

export async function fromIds(ids: Array<Comment["id"]>) {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(comments)
      .where(and(inArray(comments.id, ids), eq(comments.orgId, org.id))),
  );
}

export const update = fn(
  updateCommentMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    const users = await Users.withOrderAccess(values.orderId);
    if (!users.some((u) => u.id === user.id))
      throw new ForbiddenError(
        `User "${user.id}" cannot update comment "${id}" on order "${values.orderId}", order access forbidden.`,
      );

    return useTransaction(async (tx) => {
      await tx
        .update(comments)
        .set(values)
        .where(and(eq(comments.id, id), eq(comments.orgId, org.id)));

      await afterTransaction(() =>
        Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
      );
    });
  },
);

export const delete_ = fn(
  deleteCommentMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    const users = await Users.withOrderAccess(values.orderId);
    if (!users.some((u) => u.id === user.id))
      throw new ForbiddenError(
        `User "${user.id}" cannot delete comment "${id}" on order "${values.orderId}", order access forbidden.`,
      );

    return useTransaction(async (tx) => {
      await tx
        .update(comments)
        .set(values)
        .where(and(eq(comments.id, id), eq(comments.orgId, org.id)));

      await afterTransaction(() =>
        Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
      );
    });
  },
);

export { commentSchema as schema } from "./shared";
