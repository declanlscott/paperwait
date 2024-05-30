import { sql } from "drizzle-orm";

import { PAPERCUT_API_PAGINATION_LIMIT } from "../constants";
import { CustomerToSharedAccount, db } from "../database";
import { buildConflictUpdateColumns } from "../drizzle/tables";
import {
  getSharedAccountProperties,
  listSharedAccounts,
  listUserSharedAccounts,
} from "../papercut/api";
import { SharedAccount } from "../shared-account/shared-account.sql";

import type { Organization } from "../organization";
import type { OmitTimestamps } from "../types";
import type { User } from "../user";

export async function syncSharedAccounts(orgId: Organization["id"]) {
  const names: Array<SharedAccount["name"]> = [];
  do {
    names.push(
      ...(await listSharedAccounts({
        orgId,
        input: { offset: names.length, limit: PAPERCUT_API_PAGINATION_LIMIT },
      })),
    );
  } while (names.length === PAPERCUT_API_PAGINATION_LIMIT);

  const sharedAccounts = await Promise.all(
    names.map(async (name) => {
      const properties = await getSharedAccountProperties({
        orgId,
        input: { sharedAccountName: name },
      });

      return {
        id: properties.accountId,
        orgId,
        name,
      } satisfies OmitTimestamps<SharedAccount>;
    }),
  );

  const sharedAccountName = buildConflictUpdateColumns(SharedAccount, ["name"]);

  await db
    .insert(SharedAccount)
    .values(sharedAccounts)
    .onConflictDoUpdate({
      target: [SharedAccount.id, SharedAccount.orgId],
      set: sharedAccountName,
      setWhere: sql`${SharedAccount.name} <> ${sharedAccountName}`,
    });
}

export async function syncUserSharedAccounts(
  orgId: Organization["id"],
  userId: User["id"],
  username: User["username"],
) {
  const names: Array<SharedAccount["name"]> = [];
  do {
    names.push(
      ...(await listUserSharedAccounts({
        orgId,
        input: {
          username,
          offset: names.length,
          limit: PAPERCUT_API_PAGINATION_LIMIT,
        },
      })),
    );
  } while (names.length === PAPERCUT_API_PAGINATION_LIMIT);

  const joins = await Promise.all(
    names.map(async (name) => {
      const properties = await getSharedAccountProperties({
        orgId,
        input: { sharedAccountName: name },
      });

      return {
        orgId,
        customerId: userId,
        sharedAccountId: properties.accountId,
      } satisfies CustomerToSharedAccount;
    }),
  );

  const customers = await db
    .insert(CustomerToSharedAccount)
    .values(joins)
    .onConflictDoNothing()
    .returning({
      id: CustomerToSharedAccount.customerId,
    });

  return customers;
}
