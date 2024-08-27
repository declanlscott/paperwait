import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ForbiddenError } from "../errors/http";
import { NonExhaustiveValueError } from "../errors/misc";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import * as User from "../user";
import { fn } from "../utils/helpers";
import {
  createPapercutAccountManagerAuthorizationMutationArgsSchema,
  deletePapercutAccountManagerAuthorizationMutationArgsSchema,
  deletePapercutAccountMutationArgsSchema,
} from "./shared";
import {
  papercutAccountCustomerAuthorizations,
  papercutAccountManagerAuthorizations,
  papercutAccounts,
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
      const authorization = await tx
        .insert(papercutAccountManagerAuthorizations)
        .values(values)
        .onConflictDoNothing()
        .returning({ id: papercutAccountManagerAuthorizations.id })
        .then((rows) => rows.at(0));
      if (!authorization)
        throw new Error(
          "Failed to insert papercut account manager authorization",
        );

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );

      return { authorization };
    });
  },
);

export async function accountsMetadata() {
  const { user, org } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: papercutAccounts.id,
        rowVersion: sql<number>`"${papercutAccounts._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(papercutAccounts)
      .where(eq(papercutAccounts.orgId, org.id))
      .$dynamic();

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "manager":
        return baseQuery.where(isNull(papercutAccounts.deletedAt));
      case "operator":
        return baseQuery.where(isNull(papercutAccounts.deletedAt));
      case "customer":
        return baseQuery.where(isNull(papercutAccounts.deletedAt));
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
        id: papercutAccountCustomerAuthorizations.id,
        rowVersion: sql<number>`"${papercutAccountCustomerAuthorizations._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(papercutAccountCustomerAuthorizations)
      .where(eq(papercutAccountCustomerAuthorizations.orgId, org.id))
      .$dynamic();

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "manager":
        return baseQuery.where(
          isNull(papercutAccountCustomerAuthorizations.deletedAt),
        );
      case "operator":
        return baseQuery.where(
          isNull(papercutAccountCustomerAuthorizations.deletedAt),
        );
      case "customer":
        return baseQuery.where(
          isNull(papercutAccountCustomerAuthorizations.deletedAt),
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
        id: papercutAccountManagerAuthorizations.id,
        rowVersion: sql<number>`"${papercutAccountManagerAuthorizations._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(papercutAccountManagerAuthorizations)
      .where(eq(papercutAccountManagerAuthorizations.orgId, org.id))
      .$dynamic();

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "manager":
        return baseQuery.where(
          isNull(papercutAccountManagerAuthorizations.deletedAt),
        );
      case "operator":
        return baseQuery.where(
          isNull(papercutAccountManagerAuthorizations.deletedAt),
        );
      case "customer":
        return baseQuery.where(
          isNull(papercutAccountManagerAuthorizations.deletedAt),
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
      .from(papercutAccounts)
      .where(
        and(
          inArray(papercutAccounts.id, ids),
          eq(papercutAccounts.orgId, org.id),
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
      .from(papercutAccountCustomerAuthorizations)
      .where(
        and(
          inArray(papercutAccountCustomerAuthorizations.id, ids),
          eq(papercutAccountCustomerAuthorizations.orgId, org.id),
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
      .from(papercutAccountManagerAuthorizations)
      .where(
        and(
          inArray(papercutAccountManagerAuthorizations.id, ids),
          eq(papercutAccountManagerAuthorizations.orgId, org.id),
        ),
      );
  });

export const deleteAccount = fn(
  deletePapercutAccountMutationArgsSchema,
  ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.deletePapercutAccount, ForbiddenError);

    return useTransaction(async (tx) => {
      const [adminsOps, managers, customers] = await Promise.all([
        User.fromRoles(["administrator", "operator"]),
        tx
          .select({
            managerId: papercutAccountManagerAuthorizations.managerId,
          })
          .from(papercutAccountManagerAuthorizations)
          .where(
            and(
              eq(papercutAccountManagerAuthorizations.papercutAccountId, id),
              eq(papercutAccountManagerAuthorizations.orgId, org.id),
            ),
          ),
        tx
          .select({
            customerId: papercutAccountCustomerAuthorizations.customerId,
          })
          .from(papercutAccountCustomerAuthorizations)
          .where(
            and(
              eq(papercutAccountCustomerAuthorizations.papercutAccountId, id),
              eq(papercutAccountCustomerAuthorizations.orgId, org.id),
            ),
          ),
        tx
          .update(papercutAccounts)
          .set(values)
          .where(
            and(
              eq(papercutAccounts.id, id),
              eq(papercutAccounts.orgId, org.id),
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
  ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    enforceRbac(
      user,
      mutationRbac.deletePapercutAccountManagerAuthorization,
      ForbiddenError,
    );

    return useTransaction(async (tx) => {
      await tx
        .update(papercutAccountManagerAuthorizations)
        .set(values)
        .where(
          and(
            eq(papercutAccountManagerAuthorizations.id, id),
            eq(papercutAccountManagerAuthorizations.orgId, org.id),
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
