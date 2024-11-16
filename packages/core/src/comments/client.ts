import { AccessControl } from "../access-control/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
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
    async (tx, user, { orderId }) =>
      AccessControl.enforce([tx, user, commentsTableName, "create", orderId], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: commentsTableName }],
      }),
    () => async (tx, values) =>
      tx.set(`${commentsTableName}/${values.id}`, values),
  );

  export const update = Utils.optimisticMutator(
    updateCommentMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, commentsTableName, "update", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: commentsTableName, id }],
      }),
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
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, commentsTableName, "delete", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: commentsTableName, id }],
      }),
    ({ user }) =>
      async (tx, values) => {
        if (user.profile.role === "administrator") {
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
