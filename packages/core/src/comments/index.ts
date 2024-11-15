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
  createCommentMutationArgsSchema,
  deleteCommentMutationArgsSchema,
  updateCommentMutationArgsSchema,
} from "./shared";
import { commentsTable } from "./sql";

import type { Comment } from "./sql";

export namespace Comments {
  export const create = fn(createCommentMutationArgsSchema, async (values) => {
    const hasAccess = await Permissions.hasAccess(
      commentsTable._.name,
      "create",
      values.orderId,
    );
    if (!hasAccess)
      throw new ApplicationError.AccessDenied({ name: commentsTable._.name });

    return useTransaction(async (tx) => {
      const [users] = await Promise.all([
        Users.withOrderAccess(values.orderId),
        tx.insert(commentsTable).values(values),
      ]);

      await afterTransaction(() =>
        Replicache.poke(users.map((u) => Realtime.formatChannel("user", u.id))),
      );
    });
  });

  export const read = async (ids: Array<Comment["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(commentsTable)
        .where(
          and(
            inArray(commentsTable.id, ids),
            eq(commentsTable.tenantId, useAuthenticated().tenant.id),
          ),
        ),
    );

  export const update = fn(
    updateCommentMutationArgsSchema,
    async ({ id, ...values }) => {
      const hasAccess = await Permissions.hasAccess(
        commentsTable._.name,
        "update",
        id,
      );
      if (!hasAccess)
        throw new ApplicationError.AccessDenied({
          name: commentsTable._.name,
          id,
        });

      return useTransaction(async (tx) => {
        const [users] = await Promise.all([
          Users.withOrderAccess(values.orderId),
          tx
            .update(commentsTable)
            .set(values)
            .where(
              and(
                eq(commentsTable.id, id),
                eq(commentsTable.tenantId, useAuthenticated().tenant.id),
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
    deleteCommentMutationArgsSchema,
    async ({ id, ...values }) => {
      const hasAccess = await Permissions.hasAccess(
        commentsTable._.name,
        "delete",
        id,
      );
      if (!hasAccess)
        throw new ApplicationError.AccessDenied({
          name: commentsTable._.name,
          id,
        });

      return useTransaction(async (tx) => {
        const [users] = await Promise.all([
          Users.withOrderAccess(values.orderId),
          tx
            .update(commentsTable)
            .set(values)
            .where(
              and(
                eq(commentsTable.id, id),
                eq(commentsTable.tenantId, useAuthenticated().tenant.id),
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
