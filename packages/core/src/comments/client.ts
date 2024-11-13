import { ordersTableName } from "../orders/shared";
import { mutationRbac } from "../replicache/shared";
import { Users } from "../users/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import { enforceRbac } from "../utils/shared";
import {
  commentsTableName,
  createCommentMutationArgsSchema,
  deleteCommentMutationArgsSchema,
  updateCommentMutationArgsSchema,
} from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Comment } from "./sql";

export namespace Comments {
  export const create = Utils.optimisticMutator(
    createCommentMutationArgsSchema,
    async (user, tx, values) => {
      const users = await Users.withOrderAccess(tx, values.orderId);

      if (
        users.some((u) => u.id === user.id) ||
        enforceRbac(user, mutationRbac.createComment, {
          Error: ApplicationError.AccessDenied,
          args: [{ name: commentsTableName }],
        })
      )
        return true;

      throw new ApplicationError.AccessDenied({
        name: ordersTableName,
        id: values.orderId,
      });
    },
    () => async (tx, values) =>
      tx.set(`${commentsTableName}/${values.id}`, values),
  );

  export const update = Utils.optimisticMutator(
    updateCommentMutationArgsSchema,
    async (user, tx, values) => {
      const users = await Users.withOrderAccess(tx, values.orderId);

      if (
        users.some((u) => u.id === user.id) ||
        enforceRbac(user, mutationRbac.updateComment, {
          Error: ApplicationError.AccessDenied,
          args: [{ name: commentsTableName, id: values.id }],
        })
      )
        return true;

      throw new ApplicationError.AccessDenied({
        name: ordersTableName,
        id: values.orderId,
      });
    },
    () => async (tx, values) => {
      const prev = await tx.get<Comment>(`${commentsTableName}/${values.id}`);
      if (!prev)
        throw new ApplicationError.EntityNotFound({
          name: commentsTableName,
          id: values.id,
        });

      const next = {
        ...prev,
        ...values,
      } satisfies DeepReadonlyObject<Comment>;

      return tx.set(`${commentsTableName}/${values.id}`, next);
    },
  );

  export const delete_ = Utils.optimisticMutator(
    deleteCommentMutationArgsSchema,
    async (user, tx, values) => {
      const users = await Users.withOrderAccess(tx, values.orderId);

      if (
        users.some((u) => u.id === user.id) ||
        enforceRbac(user, mutationRbac.deleteComment, {
          Error: ApplicationError.AccessDenied,
          args: [{ name: commentsTableName, id: values.id }],
        })
      )
        return true;

      throw new ApplicationError.AccessDenied({
        name: ordersTableName,
        id: values.orderId,
      });
    },
    ({ user }) =>
      async (tx, values) => {
        if (enforceRbac(user, ["administrator"])) {
          const prev = await tx.get<Comment>(
            `${commentsTableName}/${values.id}`,
          );
          if (!prev)
            throw new ApplicationError.EntityNotFound({
              name: commentsTableName,
              id: values.id,
            });

          const next = {
            ...prev,
            ...values,
          } satisfies DeepReadonlyObject<Comment>;

          return tx.set(`${commentsTableName}/${values.id}`, next);
        }

        const success = await tx.del(`${commentsTableName}/${values.id}`);
        if (!success)
          throw new ApplicationError.EntityNotFound({
            name: commentsTableName,
            id: values.id,
          });
      },
  );
}
