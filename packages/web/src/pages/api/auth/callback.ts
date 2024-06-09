import { createSession } from "@paperwait/core/auth";
import { getSharedAccountPropertiesOutputIndex } from "@paperwait/core/constants";
import { db, transact } from "@paperwait/core/database";
import {
  BadRequestError,
  DatabaseError,
  handlePromiseResult,
  HttpError,
  InternalServerError,
  NotFoundError,
  NotImplementedError,
  UnauthorizedError,
} from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import {
  getSharedAccountProperties,
  isUserExists,
  listUserSharedAccounts,
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "@paperwait/core/papercut";
import { formatChannel } from "@paperwait/core/realtime";
import { getUsersByRoles, poke } from "@paperwait/core/replicache";
import { User } from "@paperwait/core/user";
import { validate } from "@paperwait/core/valibot";
import { OAuth2RequestError } from "arctic";
import { and, eq } from "drizzle-orm";
import ky from "ky";
import { parseJWT } from "oslo/jwt";
import { isDeepEqual } from "remeda";
import * as v from "valibot";

import entraId from "~/lib/auth/entra-id";
import google from "~/lib/auth/google";
import { Registration } from "~/lib/schemas";

import type { Provider } from "@paperwait/core/organization";
import type { OmitTimestamps } from "@paperwait/core/types";
import type { GoogleTokens, MicrosoftEntraIdTokens } from "arctic";
import type { APIContext } from "astro";

type Tokens = MicrosoftEntraIdTokens | GoogleTokens;

type EntraIdUserInfo = {
  sub: string;
  name: string;
  family_name: string;
  given_name: string;
  picture: string;
  email: string;
};

type GoogleUserInfo = {
  sub: string;
  name: string;
  given_name: string;
  picture: string;
  email: string;
};

export async function GET(context: APIContext) {
  const code = context.url.searchParams.get("code");
  const state = context.url.searchParams.get("state");

  const storedProvider = context.cookies.get("provider");
  const storedState = context.cookies.get("state");
  const storedCodeVerifier = context.cookies.get("code_verifier");
  const storedOrgId = context.cookies.get("org");

  const redirect = context.cookies.get("redirect")?.value ?? "/dashboard";

  try {
    if (
      !code ||
      !state ||
      !storedProvider ||
      !storedState ||
      !storedCodeVerifier ||
      !storedOrgId
    )
      throw new BadRequestError("Missing required parameters");

    const provider = validate(
      Registration.entries.authProvider,
      storedProvider.value,
      {
        Error: InternalServerError,
        message: "Failed to parse provider",
      },
    );

    const tokens = await getTokens(provider, code, storedCodeVerifier.value);

    const idToken = parseJWT(tokens.idToken)!;

    const idTokenPayload = parseIdTokenPayload(provider, idToken.payload);

    const [org] = await db
      .select({ status: Organization.status })
      .from(Organization)
      .where(
        and(
          eq(Organization.providerId, idTokenPayload.orgProviderId),
          eq(Organization.id, storedOrgId.value),
        ),
      );
    if (!org)
      throw new NotFoundError(`
        Failed to find organization (${storedOrgId.value}) with providerId: ${idTokenPayload.orgProviderId}
      `);

    const results = await Promise.allSettled([
      isUserExists({
        orgId: storedOrgId.value,
        input: { username: idTokenPayload.username },
      }).then((exists) => {
        if (!exists)
          throw new UnauthorizedError("User does not exist in PaperCut");

        return exists;
      }),
      getUserInfo(provider, tokens.accessToken),
    ]);

    handlePromiseResult(results[0]);
    const userInfo = handlePromiseResult(results[1]);

    const userId = await processUser(
      { id: storedOrgId.value, status: org.status },
      { idTokenPayload, info: userInfo },
    );

    const { cookie } = await createSession(userId, storedOrgId.value);

    context.cookies.set(cookie.name, cookie.value, cookie.attributes);

    return context.redirect(redirect);
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof OAuth2RequestError)
      return new Response(e.message, { status: 400 });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });

    return new Response("Internal server error", { status: 500 });
  }
}

async function getTokens(
  provider: Provider,
  code: string,
  codeVerifier: string,
): Promise<Tokens> {
  switch (provider) {
    case "entra-id":
      return await entraId.validateAuthorizationCode(code, codeVerifier);
    case "google":
      return await google.validateAuthorizationCode(code, codeVerifier);
    default:
      provider satisfies never;

      throw new NotImplementedError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Provider "${provider}" is not implemented`,
      );
  }
}

type IdTokenPayload = {
  userProviderId: string;
  orgProviderId: string;
  username: string;
};

function parseIdTokenPayload(
  provider: Provider,
  payload: unknown,
): IdTokenPayload {
  switch (provider) {
    case "entra-id": {
      const { tid, oid, preferred_username } = validate(
        v.object({
          tid: v.pipe(v.string(), v.uuid()),
          oid: v.pipe(v.string(), v.uuid()),
          preferred_username: v.string(),
        }),
        payload,
        {
          Error: InternalServerError,
          message: `Failed to parse ${provider} id token payload`,
        },
      );

      return {
        orgProviderId: tid,
        userProviderId: oid,
        username: preferred_username,
      };
    }
    case "google": {
      const { hd, sub, name } = validate(
        v.object({ hd: v.string(), sub: v.string(), name: v.string() }),
        payload,
        {
          Error: InternalServerError,
          message: `Failed to parse ${provider} id token payload`,
        },
      );

      return {
        orgProviderId: hd,
        userProviderId: sub,
        username: name,
      };
    }
    default: {
      provider satisfies never;

      throw new NotImplementedError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Provider "${provider}" is not implemented`,
      );
    }
  }
}

type UserInfo = EntraIdUserInfo | GoogleUserInfo;

async function getUserInfo(
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

async function processUser(
  org: Pick<Organization, "id" | "status">,
  user: {
    idTokenPayload: IdTokenPayload;
    info: UserInfo;
  },
): Promise<User["id"]> {
  const [existingUser] = await db
    .select({
      id: User.id,
      name: User.name,
      email: User.email,
      username: User.username,
      deletedAt: User.deletedAt,
    })
    .from(User)
    .where(
      and(
        eq(User.providerId, user.idTokenPayload.userProviderId),
        eq(User.orgId, org.id),
      ),
    );

  // Create user if it doesn't exist
  if (!existingUser) {
    const { channels, newUser } = await transact(async (tx) => {
      const isInitializing = org.status === "initializing";

      const [recipients, [newUser], sharedAccountNames] = await Promise.all([
        // Get administrators and operators in the organization
        getUsersByRoles(tx, org.id, ["administrator", "operator"]),
        // Create new user
        tx
          .insert(User)
          .values({
            orgId: org.id,
            providerId: user.idTokenPayload.userProviderId,
            role: isInitializing ? "administrator" : "customer",
            name: user.info.name,
            email: user.info.email,
            username: user.idTokenPayload.username,
          })
          .returning({ id: User.id }),
        // Get names of the shared accounts the user has access to
        listUserSharedAccounts({
          orgId: org.id,
          input: { username: user.idTokenPayload.username },
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

  if (existingUser.deletedAt) throw new UnauthorizedError("User is deleted");

  const existingUserInfo = {
    name: existingUser.name,
    email: existingUser.email,
    username: existingUser.username,
  };
  const freshUserInfo = {
    name: user.info.name,
    email: user.info.email,
    username: user.idTokenPayload.username,
  };

  if (!isDeepEqual(existingUserInfo, freshUserInfo)) {
    const channels = await transact(async (tx) => {
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
