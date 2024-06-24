import { and, eq, inArray, isNull } from "drizzle-orm";

import { getSharedAccountPropertiesOutputIndex } from "../constants";
import { buildConflictUpdateColumns } from "../drizzle/columns";
import { User } from "../user/user.sql";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
} from "./account.sql";
import {
  getSharedAccountProperties,
  listSharedAccounts,
  listUserSharedAccounts,
} from "./api";

import type { Transaction } from "../database/transaction";
import type { SyncPapercutAccountsMutationArgs } from "../mutators/schemas";
import type { Organization } from "../organization";
import type { OmitTimestamps } from "../types";

export async function syncPapercutAccounts(
  tx: Transaction,
  orgId: Organization["id"],
  _args: SyncPapercutAccountsMutationArgs,
) {
  const names = await listSharedAccounts({ orgId, input: {} });

  const [
    prevPapercutAccounts,
    nextPapercutAccounts,
    users,
    prevPapercutAccountCustomerAuthorizations,
  ] = await Promise.all([
    // Fetch previous papercut accounts
    tx
      .select({
        id: PapercutAccount.id,
        name: PapercutAccount.name,
        orgId: PapercutAccount.orgId,
      })
      .from(PapercutAccount)
      .where(
        and(
          eq(PapercutAccount.orgId, orgId),
          isNull(PapercutAccount.deletedAt),
        ),
      ),
    // Fetch next papercut accounts
    Promise.all(
      names.map(async (name) => {
        const properties = await getSharedAccountProperties({
          orgId,
          input: { sharedAccountName: name },
        });

        return {
          id: Number(
            properties[getSharedAccountPropertiesOutputIndex.accountId],
          ),
          orgId,
          name,
        } satisfies OmitTimestamps<PapercutAccount>;
      }),
    ),
    // Fetch all users
    tx
      .select({ id: User.id, username: User.username })
      .from(User)
      .where(eq(User.orgId, orgId)),
    // Fetch previous papercut account customer authorizations
    tx
      .select({
        id: PapercutAccountCustomerAuthorization.id,
        customerId: PapercutAccountCustomerAuthorization.customerId,
        papercutAccountId:
          PapercutAccountCustomerAuthorization.papercutAccountId,
        orgId: PapercutAccountCustomerAuthorization.orgId,
      })
      .from(PapercutAccountCustomerAuthorization)
      .where(
        and(
          eq(PapercutAccountCustomerAuthorization.orgId, orgId),
          isNull(PapercutAccountCustomerAuthorization.deletedAt),
        ),
      ),
  ]);

  // Calculate diff
  const papercutAccountsDiff = diffPapercutAccounts(
    prevPapercutAccounts,
    nextPapercutAccounts,
  );

  // Build next papercut account customer authorizations
  const nextPapercutAccountCustomerAuthorizations = await Promise.all(
    users.map(async (user) => {
      const names = await listUserSharedAccounts({
        orgId,
        input: {
          username: user.username,
          ignoreUserAccountSelectionConfig: true,
        },
      });

      const userSharedAccounts = names
        .map((name) =>
          nextPapercutAccounts.find(
            (papercutAccount) => papercutAccount.name === name,
          ),
        )
        .filter(Boolean);

      return userSharedAccounts.map(
        ({ id: papercutAccountId }) =>
          ({
            orgId,
            customerId: user.id,
            papercutAccountId,
          }) satisfies Omit<
            OmitTimestamps<PapercutAccountCustomerAuthorization>,
            "id"
          >,
      );
    }),
  ).then((result) => result.flat());

  // Calculate diff
  const papercutAccountCustomerAuthorizationsDiff =
    diffPapercutAccountCustomerAuthorizations(
      prevPapercutAccountCustomerAuthorizations,
      nextPapercutAccountCustomerAuthorizations,
    );

  await Promise.all([
    // Insert papercut accounts
    papercutAccountsDiff.puts.length &&
      tx
        .insert(PapercutAccount)
        .values(papercutAccountsDiff.puts)
        .onConflictDoUpdate({
          target: [PapercutAccount.id, PapercutAccount.orgId],
          set: {
            ...buildConflictUpdateColumns(PapercutAccount, ["name"]),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          },
        }),
    // Soft delete papercut accounts
    papercutAccountsDiff.dels.length &&
      tx
        .update(PapercutAccount)
        .set({ deletedAt: new Date().toISOString() })
        .where(
          and(
            inArray(PapercutAccount.id, papercutAccountsDiff.dels),
            eq(PapercutAccount.orgId, orgId),
          ),
        ),
    // Insert customer authorizations
    papercutAccountCustomerAuthorizationsDiff.puts.length &&
      tx
        .insert(PapercutAccountCustomerAuthorization)
        .values(papercutAccountCustomerAuthorizationsDiff.puts)
        .onConflictDoUpdate({
          target: [
            PapercutAccountCustomerAuthorization.papercutAccountId,
            PapercutAccountCustomerAuthorization.customerId,
          ],
          set: {
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          },
        }),
    // Soft delete customer authorizations
    papercutAccountCustomerAuthorizationsDiff.dels.length &&
      tx
        .update(PapercutAccountCustomerAuthorization)
        .set({ deletedAt: new Date().toISOString() })
        .where(
          and(
            eq(
              inArray(
                PapercutAccountCustomerAuthorization.id,
                papercutAccountCustomerAuthorizationsDiff.dels,
              ),
              eq(PapercutAccountCustomerAuthorization.orgId, orgId),
            ),
          ),
        ),
  ]);
}

type PapercutAccountsDiff = {
  puts: Array<OmitTimestamps<PapercutAccount>>;
  dels: Array<PapercutAccount["id"]>;
};

function diffPapercutAccounts(
  prev: Array<OmitTimestamps<PapercutAccount>>,
  next: Array<OmitTimestamps<PapercutAccount>>,
) {
  return {
    puts: next.filter(
      (nextAccount) =>
        !prev.some((prevAccount) => prevAccount.id === nextAccount.id),
    ),
    dels: prev
      .filter(
        (prevAccount) =>
          !next.some((nextAccount) => nextAccount.id === prevAccount.id),
      )
      .map((entry) => entry.id),
  } satisfies PapercutAccountsDiff;
}

type PapercutAccountCustomerAuthorizationsDiff = {
  puts: Array<Omit<OmitTimestamps<PapercutAccountCustomerAuthorization>, "id">>;
  dels: Array<PapercutAccountCustomerAuthorization["id"]>;
};

function diffPapercutAccountCustomerAuthorizations(
  prev: Array<OmitTimestamps<PapercutAccountCustomerAuthorization>>,
  next: Array<Omit<OmitTimestamps<PapercutAccountCustomerAuthorization>, "id">>,
) {
  return {
    puts: next.filter(
      (nextAuthorization) =>
        !prev.some(
          (prevAuthorization) =>
            prevAuthorization.customerId === nextAuthorization.customerId &&
            prevAuthorization.papercutAccountId ===
              nextAuthorization.papercutAccountId,
        ),
    ),
    dels: prev
      .filter(
        (prevAuthorization) =>
          !next.some(
            (nextAuthorization) =>
              nextAuthorization.customerId === prevAuthorization.customerId &&
              nextAuthorization.papercutAccountId ===
                prevAuthorization.papercutAccountId,
          ),
      )
      .map(({ id }) => id),
  } satisfies PapercutAccountCustomerAuthorizationsDiff;
}
