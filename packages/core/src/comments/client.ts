import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import {
  commentsTableName,
  createCommentMutationArgsSchema,
  deleteCommentMutationArgsSchema,
  updateCommentMutationArgsSchema,
} from "./shared";

export namespace Comments {
  export const create = Utils.optimisticMutator(
    createCommentMutationArgsSchema,
    async (tx, user, { orderId }) =>
      AccessControl.enforce([tx, user, commentsTableName, "create", orderId], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: commentsTableName }],
      }),
    () => async (tx, values) =>
      Replicache.set(tx, commentsTableName, values.id, values),
  );

  export const update = Utils.optimisticMutator(
    updateCommentMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, commentsTableName, "update", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: commentsTableName, id }],
      }),
    () => async (tx, values) => {
      const prev = await Replicache.get(tx, commentsTableName, values.id);

      return Replicache.set(tx, commentsTableName, values.id, {
        ...prev,
        ...values,
      });
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
          const prev = await Replicache.get(tx, commentsTableName, values.id);

          return Replicache.set(tx, commentsTableName, values.id, {
            ...prev,
            ...values,
          });
        }

        await Replicache.del(tx, commentsTableName, values.id);
      },
  );
}
