import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ForbiddenError } from "../errors/http";
import { NonExhaustiveValueError } from "../errors/misc";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import * as Users from "../users";
import { fn } from "../utils/helpers";
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

export const createAccountManagerAuthorization = fn(
  createPapercutAccountManagerAuthorizationMutationArgsSchema,
  async (values) => {
    const { user, org } = useAuthenticated();

    enforceRbac(
      user,
      mutationRbac.createPapercutAccountManagerAuthorization,
      ForbiddenError,
    );

    return useTransaction(async (tx) => {
      await tx
        .insert(papercutAccountManagerAuthorizationsTable)
        .values(values)
        .onConflictDoNothing();

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export async function accountsMetadata() {
  const { user, org } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: papercutAccountsTable.id,
        rowVersion: sql<number>`"${papercutAccountsTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(papercutAccountsTable)
      .where(eq(papercutAccountsTable.orgId, org.id))
      .$dynamic();

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "manager":
        return baseQuery.where(isNull(papercutAccountsTable.deletedAt));
      case "operator":
        return baseQuery.where(isNull(papercutAccountsTable.deletedAt));
      case "customer":
        return baseQuery.where(isNull(papercutAccountsTable.deletedAt));
      default:
        throw new NonExhaustiveValueError(user.role);
    }
  });
}

export async function accountCustomerAuthorizationsMetadata() {
  const { user, org } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: papercutAccountCustomerAuthorizationsTable.id,
        rowVersion: sql<number>`"${papercutAccountCustomerAuthorizationsTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(papercutAccountCustomerAuthorizationsTable)
      .where(eq(papercutAccountCustomerAuthorizationsTable.orgId, org.id))
      .$dynamic();

    switch (user.role) {
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
        throw new NonExhaustiveValueError(user.role);
    }
  });
}

export const accountManagerAuthorizationsMetadata = async () =>
  useTransaction((tx) => {
    const { user, org } = useAuthenticated();

    const baseQuery = tx
      .select({
        id: papercutAccountManagerAuthorizationsTable.id,
        rowVersion: sql<number>`"${papercutAccountManagerAuthorizationsTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(papercutAccountManagerAuthorizationsTable)
      .where(eq(papercutAccountManagerAuthorizationsTable.orgId, org.id))
      .$dynamic();

    switch (user.role) {
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
        throw new NonExhaustiveValueError(user.role);
    }
  });

export async function accountsFromIds(ids: Array<PapercutAccount["id"]>) {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(papercutAccountsTable)
      .where(
        and(
          inArray(papercutAccountsTable.id, ids),
          eq(papercutAccountsTable.orgId, org.id),
        ),
      ),
  );
}

export const accountCustomerAuthorizationsFromIds = async (
  ids: Array<PapercutAccountCustomerAuthorization["id"]>,
) =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select()
      .from(papercutAccountCustomerAuthorizationsTable)
      .where(
        and(
          inArray(papercutAccountCustomerAuthorizationsTable.id, ids),
          eq(papercutAccountCustomerAuthorizationsTable.orgId, org.id),
        ),
      );
  });

export const accountManagerAuthorizationsFromIds = async (
  ids: Array<PapercutAccountManagerAuthorization["id"]>,
) =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select()
      .from(papercutAccountManagerAuthorizationsTable)
      .where(
        and(
          inArray(papercutAccountManagerAuthorizationsTable.id, ids),
          eq(papercutAccountManagerAuthorizationsTable.orgId, org.id),
        ),
      );
  });

export const deleteAccount = fn(
  deletePapercutAccountMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.deletePapercutAccount, ForbiddenError);

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
              eq(papercutAccountManagerAuthorizationsTable.orgId, org.id),
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
              eq(papercutAccountCustomerAuthorizationsTable.orgId, org.id),
            ),
          ),
        tx
          .update(papercutAccountsTable)
          .set(values)
          .where(
            and(
              eq(papercutAccountsTable.id, id),
              eq(papercutAccountsTable.orgId, org.id),
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
    const { user, org } = useAuthenticated();

    enforceRbac(
      user,
      mutationRbac.deletePapercutAccountManagerAuthorization,
      ForbiddenError,
    );

    return useTransaction(async (tx) => {
      await tx
        .update(papercutAccountManagerAuthorizationsTable)
        .set(values)
        .where(
          and(
            eq(papercutAccountManagerAuthorizationsTable.id, id),
            eq(papercutAccountManagerAuthorizationsTable.orgId, org.id),
          ),
        );

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export {
  papercutAccountSchema as accountSchema,
  papercutAccountCustomerAuthorizationSchema as accountCustomerAuthorizationSchema,
  papercutAccountManagerAuthorizationSchema as accountManagerAuthorizationSchema,
} from "./shared";
