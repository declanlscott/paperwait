import { AccessControl } from "../access-control/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import {
  createPapercutAccountManagerAuthorizationMutationArgsSchema,
  deletePapercutAccountManagerAuthorizationMutationArgsSchema,
  deletePapercutAccountMutationArgsSchema,
  papercutAccountManagerAuthorizationsTableName,
  papercutAccountsTableName,
  updatePapercutAccountApprovalThresholdMutationArgsSchema,
} from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type {
  PapercutAccount,
  PapercutAccountManagerAuthorization,
} from "./sql";

export namespace Papercut {
  export const createAccountManagerAuthorization = Utils.optimisticMutator(
    createPapercutAccountManagerAuthorizationMutationArgsSchema,
    async (tx, user) =>
      AccessControl.enforce(
        [tx, user, papercutAccountManagerAuthorizationsTableName, "create"],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: papercutAccountManagerAuthorizationsTableName }],
        },
      ),
    () => async (tx, values) =>
      tx.set(
        `${papercutAccountManagerAuthorizationsTableName}/${values.id}`,
        values,
      ),
  );

  export const updateAccountApprovalThreshold = Utils.optimisticMutator(
    updatePapercutAccountApprovalThresholdMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce(
        [tx, user, papercutAccountsTableName, "update", id],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: papercutAccountsTableName, id }],
        },
      ),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await tx.get<PapercutAccount>(
          `${papercutAccountsTableName}/${id}`,
        );
        if (!prev)
          throw new ApplicationError.EntityNotFound({
            name: papercutAccountsTableName,
            id,
          });

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<PapercutAccount>;

        return tx.set(`${papercutAccountsTableName}/${id}`, next);
      },
  );

  export const deleteAccount = Utils.optimisticMutator(
    deletePapercutAccountMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, papercutAccountsTableName, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: papercutAccountsTableName, id }],
      }),
    ({ user }) =>
      async (tx, { id, ...values }) => {
        if (user.profile.role === "administrator") {
          const prev = await tx.get<PapercutAccount>(
            `${papercutAccountsTableName}/${id}`,
          );
          if (!prev)
            throw new ApplicationError.EntityNotFound({
              name: papercutAccountsTableName,
              id,
            });

          const next = {
            ...prev,
            ...values,
          } satisfies DeepReadonlyObject<PapercutAccount>;

          return tx.set(`${papercutAccountsTableName}/${id}`, next);
        }

        const success = await tx.del(`${papercutAccountsTableName}/${id}`);
        if (!success)
          throw new ApplicationError.EntityNotFound({
            name: papercutAccountsTableName,
            id,
          });
      },
  );

  export const deleteAccountManagerAuthorization = Utils.optimisticMutator(
    deletePapercutAccountManagerAuthorizationMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce(
        [tx, user, papercutAccountManagerAuthorizationsTableName, "delete"],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: papercutAccountManagerAuthorizationsTableName, id }],
        },
      ),
    ({ user }) =>
      async (tx, { id, ...values }) => {
        if (user.profile.role === "administrator") {
          const prev = await tx.get<PapercutAccountManagerAuthorization>(
            `${papercutAccountManagerAuthorizationsTableName}/${id}`,
          );
          if (!prev)
            throw new ApplicationError.EntityNotFound({
              name: papercutAccountManagerAuthorizationsTableName,
              id,
            });

          const next = {
            ...prev,
            ...values,
          } satisfies DeepReadonlyObject<PapercutAccountManagerAuthorization>;

          return tx.set(
            `${papercutAccountManagerAuthorizationsTableName}/${id}`,
            next,
          );
        }

        const success = await tx.del(
          `${papercutAccountManagerAuthorizationsTableName}/${id}`,
        );
        if (!success)
          throw new ApplicationError.EntityNotFound({
            name: papercutAccountManagerAuthorizationsTableName,
            id,
          });
      },
  );
}
