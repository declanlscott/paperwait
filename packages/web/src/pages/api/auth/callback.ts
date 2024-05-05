import { createSession } from "@paperwait/core/auth";
import { invokeLambda } from "@paperwait/core/aws";
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
import { pokeMany } from "@paperwait/core/replicache";
import { User } from "@paperwait/core/user";
import { parseSchema } from "@paperwait/core/utils";
import {
  isUserExistsOutputSchema,
  xmlRpcMethod,
  xmlRpcResultSchema,
} from "@paperwait/core/xml-rpc";
import { OAuth2RequestError } from "arctic";
import { and, eq } from "drizzle-orm";
import ky from "ky";
import { parseJWT } from "oslo/jwt";
import { Resource } from "sst";
import { object, string } from "valibot";

import entraId from "~/lib/auth/entra-id";
import google from "~/lib/auth/google";

import type { Provider } from "@paperwait/core/organization";
import type { XmlRpcInput } from "@paperwait/core/xml-rpc";
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
  id: string;
  name: string;
  family_name: string;
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

  if (
    !code ||
    !state ||
    !storedProvider ||
    !storedState ||
    !storedCodeVerifier ||
    !storedOrgId
  )
    throw new BadRequestError("Missing required parameters");

  const provider = storedProvider.value as Provider;

  try {
    const tokens = await getTokens(provider, code, storedCodeVerifier.value);

    const idToken = parseJWT(tokens.idToken)!;
    const userProviderId = idToken.subject!;

    const orgProviderId = parseOrgProviderId(provider, tokens.idToken);

    const [org] = await db
      .select({ status: Organization.status })
      .from(Organization)
      .where(
        and(
          eq(Organization.providerId, orgProviderId),
          eq(Organization.id, storedOrgId.value),
        ),
      );
    if (!org) {
      throw new NotFoundError(`
        Failed to find organization (${storedOrgId.value}) with providerId: ${orgProviderId}
      `);
    }

    // await checkPapercutUser("");

    const [existingUser] = await db
      .select({ id: User.id })
      .from(User)
      .where(eq(User.providerId, userProviderId));

    if (existingUser) {
      const { cookie } = await createSession(existingUser.id);

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
          providerId: userProviderId,
          orgId: storedOrgId.value,
          name: userInfo.name,
          email: userInfo.email,
          role: isInitializing ? "administrator" : "customer",
        })
        .returning({ id: User.id });

      if (isInitializing) {
        await tx
          .update(Organization)
          .set({ status: "active" })
          .where(eq(Organization.id, storedOrgId.value));
      }

      return { newUser, admins };
    });

    await pokeMany(admins.map(({ id }) => id));

    const { cookie } = await createSession(newUser.id);

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

    return new Response("An unexpected error occurred", { status: 500 });
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

function parseOrgProviderId(provider: Provider, idToken: string) {
  switch (provider) {
    case "entra-id":
      return parseSchema(object({ tid: string() }), idToken, {
        className: InternalServerError,
        message: "Failed to parse id token payload",
      }).tid;
    case "google":
      return parseSchema(object({ hd: string() }), idToken, {
        className: InternalServerError,
        message: "Failed to parse id token payload",
      }).hd;
    default:
      provider satisfies never;
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new InternalServerError(`Unknown provider: ${provider}`);
  }
}

async function checkPapercutUser(username: string) {
  const { Payload } = await invokeLambda({
    FunctionName: Resource.XmlRpcApi.name,
    InvocationType: "Event",
    Payload: JSON.stringify({
      methodName: xmlRpcMethod.isUserExists,
      input: { username },
    } satisfies XmlRpcInput),
  });

  const invokeResult = parseSchema(xmlRpcResultSchema, Payload, {
    className: InternalServerError,
    message: "Failed to parse xml-rpc handler result",
  });

  if (!invokeResult.isSuccess) {
    console.log(invokeResult.reason);
    throw new InternalServerError(invokeResult.reason);
  }

  const { value: isUserExists } = parseSchema(
    isUserExistsOutputSchema,
    {
      methodName: xmlRpcMethod.isUserExists,
      value: invokeResult.value,
    },
    {
      className: InternalServerError,
      message: "Failed to parse xml-rpc output",
    },
  );

  if (!isUserExists)
    throw new UnauthorizedError("User does not exist in PaperCut");
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
