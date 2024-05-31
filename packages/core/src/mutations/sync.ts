import { eq } from "drizzle-orm";

import { buildConflictUpdateColumns } from "../drizzle/tables";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
} from "../papercut/account.sql";
import {
  getSharedAccountProperties,
  listSharedAccounts,
  listUserSharedAccounts,
} from "../papercut/api";
import { OmitTimestamps } from "../types";
import { User } from "../user/user.sql";

import type { Transaction } from "../database/transaction";
import type { SyncPapercutAccountsMutationArgs } from "../mutations/schemas";
import type { Organization } from "../organization";

export async function syncPapercutAccounts(
  tx: Transaction,
  orgId: Organization["id"],
  _args: SyncPapercutAccountsMutationArgs,
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

  const [customerAuthorizations] = await Promise.all([
    // Build the customer authorization entries
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
              papercutAccountId: sharedAccount.id,
            }) satisfies Omit<
              OmitTimestamps<PapercutAccountCustomerAuthorization>,
              "id"
            >,
        );
      }),
    ).then((result) => result.flat()),
    // Upsert the papercut accounts
    tx
      .insert(PapercutAccount)
      .values(allSharedAccounts)
      .onConflictDoUpdate({
        target: [PapercutAccount.id, PapercutAccount.orgId],
        // TODO: Set `updatedAt`
        set: buildConflictUpdateColumns(PapercutAccount, ["name"]),
      }),
  ]);

  // Insert the customer authorizations
  await tx
    .insert(PapercutAccountCustomerAuthorization)
    .values(customerAuthorizations)
    .onConflictDoNothing();
}
