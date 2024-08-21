import { and, eq, inArray, isNull } from "drizzle-orm";

import { useAuthenticated } from "../auth";
import { getSharedAccountPropertiesOutputIndex } from "../constants";
import { useTransaction } from "../orm";
import { buildConflictUpdateColumns } from "../orm/columns";
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

import type { OmitTimestamps } from "../types";

export const syncPapercutAccounts = async () =>
  await useTransaction(async (tx) => {
    const { org } = useAuthenticated();

    const names = await listSharedAccounts({ orgId: org.id, input: {} });

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
            eq(PapercutAccount.orgId, org.id),
            isNull(PapercutAccount.deletedAt),
          ),
        ),
      // Fetch next papercut accounts
      Promise.all(
        names.map(async (name) => {
          const properties = await getSharedAccountProperties({
            orgId: org.id,
            input: { sharedAccountName: name },
          });

          return {
            id: Number(
              properties[getSharedAccountPropertiesOutputIndex.accountId],
            ),
            orgId: org.id,
            name,
          } satisfies OmitTimestamps<PapercutAccount>;
        }),
      ),
      // Fetch all users
      tx
        .select({ id: User.id, username: User.username })
        .from(User)
        .where(eq(User.orgId, org.id)),
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
            eq(PapercutAccountCustomerAuthorization.orgId, org.id),
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
          orgId: org.id,
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
              orgId: org.id,
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
              eq(PapercutAccount.orgId, org.id),
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
                eq(PapercutAccountCustomerAuthorization.orgId, org.id),
              ),
            ),
          ),
    ]);
  });

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
