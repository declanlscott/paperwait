import { enforceRbac, mutationRbac } from "../auth/rbac";
import {
  EntityNotFoundError,
  InvalidUserRoleError,
} from "../errors/application";
import { optimisticMutator } from "../utils/helpers";
import {
  createPapercutAccountManagerAuthorizationMutationArgsSchema,
  deletePapercutAccountManagerAuthorizationMutationArgsSchema,
  deletePapercutAccountMutationArgsSchema,
  papercutAccountManagerAuthorizationsTableName,
  papercutAccountsTableName,
} from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type {
  PapercutAccount,
  PapercutAccountManagerAuthorization,
} from "./sql";

export const createAccountManagerAuthorization = optimisticMutator(
  createPapercutAccountManagerAuthorizationMutationArgsSchema,
  (user) =>
    enforceRbac(
      user,
      mutationRbac.createPapercutAccountManagerAuthorization,
      InvalidUserRoleError,
    ),
  () => async (tx, values) =>
    tx.set(
      `${papercutAccountManagerAuthorizationsTableName}/${values.id}`,
      values,
    ),
);

export const deleteAccount = optimisticMutator(
  deletePapercutAccountMutationArgsSchema,
  (user) =>
    enforceRbac(user, mutationRbac.deletePapercutAccount, InvalidUserRoleError),
  ({ user }) =>
    async (tx, { id, ...values }) => {
      if (enforceRbac(user, ["administrator"])) {
        const prev = await tx.get<PapercutAccount>(
          `${papercutAccountsTableName}/${id}`,
        );
        if (!prev) throw new EntityNotFoundError(papercutAccountsTableName, id);

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<PapercutAccount>;

        return tx.set(`${papercutAccountsTableName}/${id}`, next);
      }

      const success = await tx.del(`${papercutAccountsTableName}/${id}`);
      if (!success)
        throw new EntityNotFoundError(papercutAccountsTableName, id);
    },
);

export const deleteAccountManagerAuthorization = optimisticMutator(
  deletePapercutAccountManagerAuthorizationMutationArgsSchema,
  (user) =>
    enforceRbac(
      user,
      mutationRbac.deletePapercutAccountManagerAuthorization,
      InvalidUserRoleError,
    ),
  ({ user }) =>
    async (tx, { id, ...values }) => {
      if (enforceRbac(user, ["administrator"])) {
        const prev = await tx.get<PapercutAccountManagerAuthorization>(
          `${papercutAccountManagerAuthorizationsTableName}/${id}`,
        );
        if (!prev)
          throw new EntityNotFoundError(
            papercutAccountManagerAuthorizationsTableName,
            id,
          );

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
        throw new EntityNotFoundError(
          papercutAccountManagerAuthorizationsTableName,
          id,
        );
    },
);
