import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
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
      Replicache.set(
        tx,
        papercutAccountManagerAuthorizationsTableName,
        values.id,
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
        const prev = await Replicache.get<PapercutAccount>(
          tx,
          papercutAccountsTableName,
          id,
        );

        return Replicache.set(tx, papercutAccountsTableName, id, {
          ...prev,
          ...values,
        });
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
          const prev = await Replicache.get<PapercutAccount>(
            tx,
            papercutAccountsTableName,
            id,
          );

          return Replicache.set(tx, papercutAccountsTableName, id, {
            ...prev,
            ...values,
          });
        }

        await Replicache.del(tx, papercutAccountsTableName, id);
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
          const prev =
            await Replicache.get<PapercutAccountManagerAuthorization>(
              tx,
              papercutAccountManagerAuthorizationsTableName,
              id,
            );

          return Replicache.set(
            tx,
            papercutAccountManagerAuthorizationsTableName,
            id,
            {
              ...prev,
              ...values,
            },
          );
        }

        await Replicache.del(
          tx,
          papercutAccountManagerAuthorizationsTableName,
          id,
        );
      },
  );
}
