import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
import { useTransaction } from "../drizzle/transaction";
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

export const accountsMetadata = async () =>
  useTransaction((tx) => {
    const { user, org } = useAuthenticated();

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
      default: {
        user.role satisfies never;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unexpected user role: ${user.role}`);
      }
    }
  });

export const accountCustomerAuthorizationsMetadata = async () =>
  useTransaction((tx) => {
    const { user, org } = useAuthenticated();

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
      default: {
        user.role satisfies never;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unexpected user role: ${user.role}`);
      }
    }
  });

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
      default: {
        user.role satisfies never;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unexpected user role: ${user.role}`);
      }
    }
  });

export const accountsFromIds = async (ids: Array<PapercutAccount["id"]>) =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select()
      .from(papercutAccounts)
      .where(
        and(
          inArray(papercutAccounts.id, ids),
          eq(papercutAccounts.orgId, org.id),
        ),
      );
  });

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

export {
  papercutAccountSchema as accountSchema,
  papercutAccountCustomerAuthorizationSchema as accountCustomerAuthorizationSchema,
  papercutAccountManagerAuthorizationSchema as accountManagerAuthorizationSchema,
} from "./schemas";
