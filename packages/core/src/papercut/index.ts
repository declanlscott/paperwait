import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { mutationRbac } from "../replicache/shared";
import { useAuthenticated } from "../sessions/context";
import { Users } from "../users";
import { Constants } from "../utils/constants";
import { ApplicationError, MiscellaneousError } from "../utils/errors";
import { enforceRbac, fn, rbacErrorMessage } from "../utils/shared";
import {
  createPapercutAccountManagerAuthorizationMutationArgsSchema,
  deletePapercutAccountManagerAuthorizationMutationArgsSchema,
  deletePapercutAccountMutationArgsSchema,
} from "./shared";
import {
  papercutAccountCustomerAuthorizationsTable,
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "./sql";

import type {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "./sql";

export namespace Papercut {
  export const createAccountManagerAuthorization = fn(
    createPapercutAccountManagerAuthorizationMutationArgsSchema,
    async (values) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(
        user,
        mutationRbac.createPapercutAccountManagerAuthorization,
        {
          Error: ApplicationError.AccessDenied,
          args: [
            rbacErrorMessage(
              user,
              "create papercut account manager authorization mutator",
            ),
          ],
        },
      );

      return useTransaction(async (tx) => {
        await tx
          .insert(papercutAccountManagerAuthorizationsTable)
          .values(values)
          .onConflictDoNothing();

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );

  export async function accountsMetadata() {
    const { user, tenant } = useAuthenticated();

    return useTransaction(async (tx) => {
      const baseQuery = tx
        .select({
          id: papercutAccountsTable.id,
          rowVersion: sql<number>`"${papercutAccountsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(papercutAccountsTable)
        .where(eq(papercutAccountsTable.tenantId, tenant.id))
        .$dynamic();

      switch (user.profile.role) {
        case "administrator":
          return baseQuery;
        case "manager":
          return baseQuery.where(isNull(papercutAccountsTable.deletedAt));
        case "operator":
          return baseQuery.where(isNull(papercutAccountsTable.deletedAt));
        case "customer":
          return baseQuery.where(isNull(papercutAccountsTable.deletedAt));
        default:
          throw new MiscellaneousError.NonExhaustiveValue(user.profile.role);
      }
    });
  }

  export async function accountCustomerAuthorizationsMetadata() {
    const { user, tenant } = useAuthenticated();

    return useTransaction(async (tx) => {
      const baseQuery = tx
        .select({
          id: papercutAccountCustomerAuthorizationsTable.id,
          rowVersion: sql<number>`"${papercutAccountCustomerAuthorizationsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(papercutAccountCustomerAuthorizationsTable)
        .where(
          eq(papercutAccountCustomerAuthorizationsTable.tenantId, tenant.id),
        )
        .$dynamic();

      switch (user.profile.role) {
        case "administrator":
          return baseQuery;
        case "manager":
          return baseQuery.where(
            isNull(papercutAccountCustomerAuthorizationsTable.deletedAt),
          );
        case "operator":
          return baseQuery.where(
            isNull(papercutAccountCustomerAuthorizationsTable.deletedAt),
          );
        case "customer":
          return baseQuery.where(
            isNull(papercutAccountCustomerAuthorizationsTable.deletedAt),
          );
        default:
          throw new MiscellaneousError.NonExhaustiveValue(user.profile.role);
      }
    });
  }

  export const accountManagerAuthorizationsMetadata = async () =>
    useTransaction((tx) => {
      const { user, tenant } = useAuthenticated();

      const baseQuery = tx
        .select({
          id: papercutAccountManagerAuthorizationsTable.id,
          rowVersion: sql<number>`"${papercutAccountManagerAuthorizationsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(papercutAccountManagerAuthorizationsTable)
        .where(
          eq(papercutAccountManagerAuthorizationsTable.tenantId, tenant.id),
        )
        .$dynamic();

      switch (user.profile.role) {
        case "administrator":
          return baseQuery;
        case "manager":
          return baseQuery.where(
            isNull(papercutAccountManagerAuthorizationsTable.deletedAt),
          );
        case "operator":
          return baseQuery.where(
            isNull(papercutAccountManagerAuthorizationsTable.deletedAt),
          );
        case "customer":
          return baseQuery.where(
            isNull(papercutAccountManagerAuthorizationsTable.deletedAt),
          );
        default:
          throw new MiscellaneousError.NonExhaustiveValue(user.profile.role);
      }
    });

  export async function accountsFromIds(ids: Array<PapercutAccount["id"]>) {
    const { tenant } = useAuthenticated();

    return useTransaction((tx) =>
      tx
        .select()
        .from(papercutAccountsTable)
        .where(
          and(
            inArray(papercutAccountsTable.id, ids),
            eq(papercutAccountsTable.tenantId, tenant.id),
          ),
        ),
    );
  }

  export const accountCustomerAuthorizationsFromIds = async (
    ids: Array<PapercutAccountCustomerAuthorization["id"]>,
  ) =>
    useTransaction((tx) => {
      const { tenant } = useAuthenticated();

      return tx
        .select()
        .from(papercutAccountCustomerAuthorizationsTable)
        .where(
          and(
            inArray(papercutAccountCustomerAuthorizationsTable.id, ids),
            eq(papercutAccountCustomerAuthorizationsTable.tenantId, tenant.id),
          ),
        );
    });

  export const accountManagerAuthorizationsFromIds = async (
    ids: Array<PapercutAccountManagerAuthorization["id"]>,
  ) =>
    useTransaction((tx) => {
      const { tenant } = useAuthenticated();

      return tx
        .select()
        .from(papercutAccountManagerAuthorizationsTable)
        .where(
          and(
            inArray(papercutAccountManagerAuthorizationsTable.id, ids),
            eq(papercutAccountManagerAuthorizationsTable.tenantId, tenant.id),
          ),
        );
    });

  export const deleteAccount = fn(
    deletePapercutAccountMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.deletePapercutAccount, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "delete papercut account mutator")],
      });

      return useTransaction(async (tx) => {
        const [adminsOps, managers, customers] = await Promise.all([
          Users.fromRoles(["administrator", "operator"]),
          tx
            .select({
              managerId: papercutAccountManagerAuthorizationsTable.managerId,
            })
            .from(papercutAccountManagerAuthorizationsTable)
            .where(
              and(
                eq(
                  papercutAccountManagerAuthorizationsTable.papercutAccountId,
                  id,
                ),
                eq(
                  papercutAccountManagerAuthorizationsTable.tenantId,
                  tenant.id,
                ),
              ),
            ),
          tx
            .select({
              customerId: papercutAccountCustomerAuthorizationsTable.customerId,
            })
            .from(papercutAccountCustomerAuthorizationsTable)
            .where(
              and(
                eq(
                  papercutAccountCustomerAuthorizationsTable.papercutAccountId,
                  id,
                ),
                eq(
                  papercutAccountCustomerAuthorizationsTable.tenantId,
                  tenant.id,
                ),
              ),
            ),
          tx
            .update(papercutAccountsTable)
            .set(values)
            .where(
              and(
                eq(papercutAccountsTable.id, id),
                eq(papercutAccountsTable.tenantId, tenant.id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          Replicache.poke([
            ...adminsOps.map((u) => Realtime.formatChannel("user", u.id)),
            ...managers.map(({ managerId }) =>
              Realtime.formatChannel("user", managerId),
            ),
            ...customers.map(({ customerId }) =>
              Realtime.formatChannel("user", customerId),
            ),
          ]),
        );
      });
    },
  );

  export const deleteAccountManagerAuthorization = fn(
    deletePapercutAccountManagerAuthorizationMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(
        user,
        mutationRbac.deletePapercutAccountManagerAuthorization,
        {
          Error: ApplicationError.AccessDenied,
          args: [
            rbacErrorMessage(
              user,
              "delete papercut account manager authorization mutator",
            ),
          ],
        },
      );

      return useTransaction(async (tx) => {
        await tx
          .update(papercutAccountManagerAuthorizationsTable)
          .set(values)
          .where(
            and(
              eq(papercutAccountManagerAuthorizationsTable.id, id),
              eq(papercutAccountManagerAuthorizationsTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );
}
