import { createSession } from "@paperwait/core/auth";
import { buildSigner } from "@paperwait/core/aws";
import { db, transact } from "@paperwait/core/database";
import {
  BadRequestError,
  DatabaseError,
  HttpError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { formatChannel } from "@paperwait/core/realtime";
import { pokeMany } from "@paperwait/core/replicache";
import { User } from "@paperwait/core/user";
import { parseSchema } from "@paperwait/core/valibot";
import { IsUserExistsResultBody } from "@paperwait/core/xml-rpc";
import { OAuth2RequestError } from "arctic";
import { and, eq } from "drizzle-orm";
import ky, { HTTPError as kyHttpError } from "ky";
import { parseJWT } from "oslo/jwt";
import { Resource } from "sst";
import { object, string, uuid } from "valibot";

import entraId from "~/lib/auth/entra-id";
import google from "~/lib/auth/google";
import { Registration } from "~/lib/schemas";

import type { Provider } from "@paperwait/core/organization";
import type { IsUserExistsEventBody } from "@paperwait/core/xml-rpc";
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

    const provider = parseSchema(
      Registration.entries.authProvider,
      storedProvider.value,
      {
        Error: InternalServerError,
        message: "Failed to parse provider",
      },
    );

    const tokens = await getTokens(provider, code, storedCodeVerifier.value);

    const idToken = parseJWT(tokens.idToken)!;

    const { orgProviderId, userProviderId, username } = parseIdTokenPayload(
      provider,
      idToken.payload,
    );

    const [org] = await db
      .select({ status: Organization.status })
      .from(Organization)
      .where(
        and(
          eq(Organization.providerId, orgProviderId),
          eq(Organization.id, storedOrgId.value),
        ),
      );
    if (!org)
      throw new NotFoundError(`
        Failed to find organization (${storedOrgId.value}) with providerId: ${orgProviderId}
      `);

    await authorizeUser({ orgId: storedOrgId.value, input: { username } });

    const [existingUser] = await db
      .select({ id: User.id, username: User.username })
      .from(User)
      .where(eq(User.providerId, userProviderId));

    if (existingUser) {
      // Update username if it has changed
      if (existingUser.username !== username) {
        const userIds = await transact(async (tx) => {
          const [user] = await tx
            .update(User)
            .set({ username })
            .where(eq(User.id, existingUser.id))
            .returning({ id: User.id });

          const admins = await tx
            .select({ id: User.id })
            .from(User)
            .where(eq(User.role, "administrator"));

          return Array.from(new Set([user.id, ...admins.map(({ id }) => id)]));
        });

        await pokeMany(userIds);
      }

      const { cookie } = await createSession(
        existingUser.id,
        storedOrgId.value,
      );

      context.cookies.set(cookie.name, cookie.value, cookie.attributes);

      return context.redirect(redirect);
    }

    const userInfo = await getUserInfo(provider, tokens.accessToken);

    const { newUser, admins } = await transact(async (tx) => {
      const isInitializing = org.status === "initializing";

      const admins = await tx
        .select({ id: User.id })
        .from(User)
        .where(eq(User.role, "administrator"));

      const [newUser] = await tx
        .insert(User)
        .values({
          orgId: storedOrgId.value,
          providerId: userProviderId,
          role: isInitializing ? "administrator" : "customer",
          name: userInfo.name,
          email: userInfo.email,
          username,
        })
        .returning({ id: User.id });

      if (isInitializing)
        await tx
          .update(Organization)
          .set({ status: "active" })
          .where(eq(Organization.id, storedOrgId.value));

      return { newUser, admins };
    });

    await pokeMany(admins.map(({ id }) => formatChannel("user", id)));

    const { cookie } = await createSession(newUser.id, storedOrgId.value);

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
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new InternalServerError(`Unknown provider: ${provider}`);
  }
}

function parseIdTokenPayload(
  provider: Provider,
  payload: unknown,
): { userProviderId: string; orgProviderId: string; username: string } {
  switch (provider) {
    case "entra-id": {
      const { tid, oid, preferred_username } = parseSchema(
        object({
          tid: string([uuid()]),
          oid: string([uuid()]),
          preferred_username: string(),
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
      const { hd, sub, name } = parseSchema(
        object({ hd: string(), sub: string(), name: string() }),
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
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new InternalServerError(`Unknown provider: ${provider}`);
    }
  }
}

async function authorizeUser(event: IsUserExistsEventBody) {
  try {
    const url = new URL(`${Resource.PapercutApiGateway.url}/is-user-exists`);

    const signer = buildSigner({ service: "execute-api" });

    const requestBody = JSON.stringify(event);

    const { headers } = await signer.sign({
      hostname: url.hostname,
      protocol: url.protocol,
      method: "POST",
      path: url.pathname,
      headers: {
        host: url.hostname,
        accept: "application/json",
      },
      body: requestBody,
    });

    const responseBody = await ky
      .post(url, { body: requestBody, headers })
      .json();

    const { output } = parseSchema(IsUserExistsResultBody, responseBody, {
      Error: InternalServerError,
      message: "Failed to parse xml-rpc output",
    });

    if (!output) throw new UnauthorizedError("User does not exist in PaperCut");
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError) throw e;
    if (e instanceof kyHttpError) throw new InternalServerError(e.message);

    throw new InternalServerError();
  }
}

async function getUserInfo(provider: Provider, accessToken: string) {
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
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new InternalServerError(`Unknown provider: ${provider}`);
  }
}
