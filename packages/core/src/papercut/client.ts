import { AccessDenied, EntityNotFound } from "../errors/application";
import { mutationRbac } from "../replicache/shared";
import { Utils } from "../utils/client";
import { enforceRbac, rbacErrorMessage } from "../utils/shared";
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

export namespace Papercut {
  export const createAccountManagerAuthorization = Utils.optimisticMutator(
    createPapercutAccountManagerAuthorizationMutationArgsSchema,
    (user) =>
      enforceRbac(
        user,
        mutationRbac.createPapercutAccountManagerAuthorization,
        {
          Error: AccessDenied,
          args: [
            rbacErrorMessage(
              user,
              "create papercut account manager authorization mutator",
            ),
          ],
        },
      ),
    () => async (tx, values) =>
      tx.set(
        `${papercutAccountManagerAuthorizationsTableName}/${values.id}`,
        values,
      ),
  );

  export const deleteAccount = Utils.optimisticMutator(
    deletePapercutAccountMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.deletePapercutAccount, {
        Error: AccessDenied,
        args: [rbacErrorMessage(user, "delete papercut account mutator")],
      }),
    ({ user }) =>
      async (tx, { id, ...values }) => {
        if (enforceRbac(user, ["administrator"])) {
          const prev = await tx.get<PapercutAccount>(
            `${papercutAccountsTableName}/${id}`,
          );
          if (!prev) throw new EntityNotFound(papercutAccountsTableName, id);

          const next = {
            ...prev,
            ...values,
          } satisfies DeepReadonlyObject<PapercutAccount>;

          return tx.set(`${papercutAccountsTableName}/${id}`, next);
        }

        const success = await tx.del(`${papercutAccountsTableName}/${id}`);
        if (!success) throw new EntityNotFound(papercutAccountsTableName, id);
      },
  );

  export const deleteAccountManagerAuthorization = Utils.optimisticMutator(
    deletePapercutAccountManagerAuthorizationMutationArgsSchema,
    (user) =>
      enforceRbac(
        user,
        mutationRbac.deletePapercutAccountManagerAuthorization,
        {
          Error: AccessDenied,
          args: [
            rbacErrorMessage(
              user,
              "delete papercut account manager authorization mutator",
            ),
          ],
        },
      ),
    ({ user }) =>
      async (tx, { id, ...values }) => {
        if (enforceRbac(user, ["administrator"])) {
          const prev = await tx.get<PapercutAccountManagerAuthorization>(
            `${papercutAccountManagerAuthorizationsTableName}/${id}`,
          );
          if (!prev)
            throw new EntityNotFound(
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
          throw new EntityNotFound(
            papercutAccountManagerAuthorizationsTableName,
            id,
          );
      },
  );
}
