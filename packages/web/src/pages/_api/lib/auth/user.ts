import { getSharedAccountPropertiesOutputIndex } from "@paperwait/core/constants";
import { getUsersByRoles } from "@paperwait/core/data";
import { db, serializable } from "@paperwait/core/database";
import { NotImplementedError, UnauthorizedError } from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import {
  getSharedAccountProperties,
  listUserSharedAccounts,
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "@paperwait/core/papercut";
import { formatChannel } from "@paperwait/core/realtime";
import { poke } from "@paperwait/core/replicache";
import { User } from "@paperwait/core/user";
import { and, eq } from "drizzle-orm";
import ky from "ky";
import { isDeepEqual } from "remeda";

import type { IdToken } from "@paperwait/core/auth-provider";
import type { Provider } from "@paperwait/core/organization";
import type { OmitTimestamps } from "@paperwait/core/types";

export type EntraIdUserInfo = {
  sub: string;
  name: string;
  family_name: string;
  given_name: string;
  picture: string;
  email: string;
};

export type GoogleUserInfo = {
  sub: string;
  name: string;
  given_name: string;
  picture: string;
  email: string;
};

export type UserInfo = EntraIdUserInfo | GoogleUserInfo;

export async function getUserInfo(
  provider: Provider,
  accessToken: string,
): Promise<UserInfo> {
  switch (provider) {
    case "entra-id":
      return await ky
        .get("https://graph.microsoft.com/oidc/userinfo", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        .json<EntraIdUserInfo>();
    case "google":
      return await ky
        .get("https://openidconnect.googleapis.com/v1/userinfo", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        .json<GoogleUserInfo>();
    default:
      provider satisfies never;

      throw new NotImplementedError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Provider "${provider}" is not implemented`,
      );
  }
}

export async function processUser(
  org: Pick<Organization, "id" | "status">,
  user: {
    idToken: IdToken;
    info: UserInfo;
  },
): Promise<User["id"]> {
  const [existingUser] = await db
    .select({
      id: User.id,
      name: User.name,
      email: User.email,
      username: User.username,
      role: User.role,
      deletedAt: User.deletedAt,
    })
    .from(User)
    .where(
      and(
        eq(User.providerId, user.idToken.userProviderId),
        eq(User.orgId, org.id),
      ),
    );

  // Create user if it doesn't exist
  if (!existingUser) {
    if (org.status === "suspended")
      throw new UnauthorizedError("Organization is suspended");

    const { channels, newUser } = await serializable(async (tx) => {
      const isInitializing = org.status === "initializing";

      const [recipients, [newUser], sharedAccountNames] = await Promise.all([
        // Get administrators and operators in the organization
        getUsersByRoles(tx, org.id, ["administrator", "operator"]),
        // Create new user
        tx
          .insert(User)
          .values({
            orgId: org.id,
            providerId: user.idToken.userProviderId,
            role: isInitializing ? "administrator" : "customer",
            name: user.info.name,
            email: user.info.email,
            username: user.idToken.username,
          })
          .returning({ id: User.id }),
        // Get names of the shared accounts the user has access to
        listUserSharedAccounts({
          orgId: org.id,
          input: { username: user.idToken.username },
        }),
        // Update organization status to active if it's still initializing
        isInitializing
          ? tx
              .update(Organization)
              .set({ status: "active" })
              .where(eq(Organization.id, org.id))
          : undefined,
      ]);

      // Build the customer authorization entries, concurrently
      const customerAuthorizations = await Promise.all(
        sharedAccountNames.map(async (sharedAccountName) => {
          const properties = await getSharedAccountProperties({
            orgId: org.id,
            input: { sharedAccountName },
          });

          return {
            orgId: org.id,
            customerId: newUser.id,
            papercutAccountId: Number(
              properties[getSharedAccountPropertiesOutputIndex.accountId],
            ),
          } satisfies Omit<
            OmitTimestamps<PapercutAccountCustomerAuthorization>,
            "id"
          >;
        }),
      );

      // Insert the customer authorizations
      if (customerAuthorizations.length > 0)
        await tx
          .insert(PapercutAccountCustomerAuthorization)
          .values(customerAuthorizations)
          .onConflictDoNothing();

      return {
        channels: recipients.map(({ id }) => formatChannel("user", id)),
        newUser,
      };
    });

    await poke(channels);

    return newUser.id;
  }

  // User already exists, continue processing

  if (existingUser.deletedAt) throw new UnauthorizedError("user deleted");

  if (org.status === "suspended" && existingUser.role !== "administrator")
    throw new UnauthorizedError("Organization is suspended");

  const existingUserInfo = {
    name: existingUser.name,
    email: existingUser.email,
    username: existingUser.username,
  };
  const freshUserInfo = {
    name: user.info.name,
    email: user.info.email,
    username: user.idToken.username,
  };

  if (!isDeepEqual(existingUserInfo, freshUserInfo)) {
    const channels = await serializable(async (tx) => {
      const [adminsOps, managers] = await Promise.all([
        getUsersByRoles(tx, org.id, ["administrator", "operator"]),
        tx
          .select({ id: User.id })
          .from(User)
          .innerJoin(
            PapercutAccountCustomerAuthorization,
            and(
              eq(User.id, PapercutAccountCustomerAuthorization.customerId),
              eq(User.orgId, PapercutAccountCustomerAuthorization.orgId),
            ),
          )
          .innerJoin(
            PapercutAccount,
            and(
              eq(
                PapercutAccountCustomerAuthorization.papercutAccountId,
                PapercutAccount.id,
              ),
              eq(
                PapercutAccountCustomerAuthorization.orgId,
                PapercutAccount.orgId,
              ),
            ),
          )
          .innerJoin(
            PapercutAccountManagerAuthorization,
            and(
              eq(
                PapercutAccount.id,
                PapercutAccountManagerAuthorization.papercutAccountId,
              ),
              eq(
                PapercutAccount.orgId,
                PapercutAccountManagerAuthorization.orgId,
              ),
            ),
          )
          .where(and(eq(User.id, existingUser.id), eq(User.orgId, org.id))),
        tx
          .update(User)
          .set(freshUserInfo)
          .where(and(eq(User.id, existingUser.id), eq(User.orgId, org.id))),
      ]);

      return [
        ...adminsOps.map(({ id }) => formatChannel("user", id)),
        ...managers.map(({ id }) => formatChannel("user", id)),
      ];
    });

    await poke(channels);
  }

  return existingUser.id;
}
