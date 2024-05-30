import { eq } from "drizzle-orm";

import { CustomerToSharedAccount } from "../database/relations.sql";
import { buildConflictUpdateColumns } from "../drizzle/tables";
import {
  getSharedAccountProperties,
  listSharedAccounts,
  listUserSharedAccounts,
} from "../papercut/api";
import { SharedAccount } from "../shared-account/shared-account.sql";
import { User } from "../user/user.sql";

import type { Transaction } from "../database/transaction";
import type { SyncSharedAccountsMutationArgs } from "../mutations/schemas";
import type { Organization } from "../organization";

export async function syncSharedAccounts(
  tx: Transaction,
  orgId: Organization["id"],
  _args: SyncSharedAccountsMutationArgs,
) {
  const allNames = await listSharedAccounts({ orgId, input: {} });

  const [allSharedAccounts, allUsers] = await Promise.all([
    // Fetch all shared accounts
    Promise.all(
      allNames.map(async (name) => {
        const properties = await getSharedAccountProperties({
          orgId,
          input: { sharedAccountName: name },
        });

        return { id: properties.accountId, orgId, name };
      }),
    ),
    // Fetch all users
    tx
      .select({ id: User.id, username: User.username })
      .from(User)
      .where(eq(User.orgId, orgId)),
  ]);

  const [joinEntries] = await Promise.all([
    // Build the join table entries
    Promise.all(
      allUsers.map(async (user) => {
        const names = await listUserSharedAccounts({
          orgId,
          input: { username: user.username },
        });

        const sharedAccounts = names
          .map((name) =>
            allSharedAccounts.find(
              (sharedAccount) => sharedAccount.name === name,
            ),
          )
          .filter(Boolean);

        return sharedAccounts.map(
          (sharedAccount) =>
            ({
              orgId,
              customerId: user.id,
              sharedAccountId: sharedAccount.id,
            }) satisfies CustomerToSharedAccount,
        );
      }),
    ).then((result) => result.flat()),
    // Upsert the shared accounts
    tx
      .insert(SharedAccount)
      .values(allSharedAccounts)
      .onConflictDoUpdate({
        target: [SharedAccount.id, SharedAccount.orgId],
        set: buildConflictUpdateColumns(SharedAccount, ["name"]),
      }),
  ]);

  // Insert the join table entries
  await tx
    .insert(CustomerToSharedAccount)
    .values(joinEntries)
    .onConflictDoNothing();
}
