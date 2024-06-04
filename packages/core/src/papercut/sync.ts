import { eq } from "drizzle-orm";

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
import type { SyncPapercutAccountsMutationArgs } from "../mutations/schemas";
import type { Organization } from "../organization";
import type { OmitTimestamps } from "../types";

export async function syncPapercutAccounts(
  tx: Transaction,
  orgId: Organization["id"],
  _args: SyncPapercutAccountsMutationArgs,
) {
  const allNames = await listSharedAccounts({ orgId, input: {} });
  if (allNames.length === 0) return;

  const [allSharedAccounts, allUsers] = await Promise.all([
    // Fetch all shared accounts
    Promise.all(
      allNames.map(async (name) => {
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
  ]);
  if (allSharedAccounts.length === 0) return;

  const [customerAuthorizations] = await Promise.all([
    // Build the customer authorization entries
    Promise.all(
      allUsers.map(async (user) => {
        const names = await listUserSharedAccounts({
          orgId,
          input: {
            username: user.username,
            ignoreUserAccountSelectionConfig: true,
          },
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
        set: {
          ...buildConflictUpdateColumns(PapercutAccount, ["name"]),
          updatedAt: new Date().toISOString(),
        },
      }),
  ]);
  if (customerAuthorizations.length === 0) return;

  // Insert the customer authorizations
  await tx
    .insert(PapercutAccountCustomerAuthorization)
    .values(customerAuthorizations)
    .onConflictDoNothing();
}
