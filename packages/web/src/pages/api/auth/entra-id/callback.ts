import { lucia } from "@paperwait/core/auth";
import { db, transact } from "@paperwait/core/database";
import {
  DatabaseError,
  MissingParameterError,
  NotFoundError,
  TooManyTransactionRetriesError,
} from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { User } from "@paperwait/core/user";
import { generateId } from "@paperwait/core/utils";
import { OAuth2RequestError } from "arctic";
import { and, eq } from "drizzle-orm";
import ky from "ky";
import { parseJWT } from "oslo/jwt";
import { object, parse, string, ValiError } from "valibot";

import entraId from "~/lib/auth/entra-id";

import type { APIContext } from "astro";

export const prerender = false;

export async function GET(context: APIContext) {
  const code = context.url.searchParams.get("code");
  const state = context.url.searchParams.get("state");

  const storedState = context.cookies.get("state");
  const storedCodeVerifier = context.cookies.get("code_verifier");
  const storedOrgId = context.cookies.get("org");

  const redirect = context.cookies.get("redirect")?.value ?? "/dashboard";

  if (!code || !state || !storedState || !storedCodeVerifier || !storedOrgId) {
    throw new MissingParameterError("Missing required parameters");
  }

  try {
    const tokens = await entraId.validateAuthorizationCode(
      code,
      storedCodeVerifier.value,
    );

    const parsedIdToken = parseJWT(tokens.idToken)!;
    const providerId = parsedIdToken.subject!;
    const { tid: tenantId } = parse(
      object({ tid: string() }),
      parsedIdToken.payload,
    );

    const [org] = await db
      .select({ status: Organization.status })
      .from(Organization)
      .where(
        and(
          eq(Organization.tenantId, tenantId),
          eq(Organization.id, storedOrgId.value),
        ),
      );
    if (!org) {
      throw new NotFoundError(`
        Failed to find organization (${storedOrgId.value}) with tenantId: ${tenantId}
      `);
    }

    const [existingUser] = await db
      .select({ id: User.id })
      .from(User)
      .where(eq(User.providerId, providerId));

    if (existingUser) {
      const session = await lucia.createSession(
        existingUser.id,
        {},
        { sessionId: generateId() },
      );
      const sessionCookie = lucia.createSessionCookie(session.id);

      context.cookies.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );

      return context.redirect(redirect);
    }

    const userInfo = await ky
      .get("https://graph.microsoft.com/oidc/userinfo", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      })
      .json<EntraIdUserInfo>();

    const newUser = await transact(async (tx) => {
      const isInitializing = org.status === "initializing";

      const [newUser] = await tx
        .insert(User)
        .values({
          providerId,
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

      return newUser;
    });

    const session = await lucia.createSession(newUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    context.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );

    return context.redirect(redirect);
  } catch (e) {
    console.error(e);

    if (e instanceof MissingParameterError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof OAuth2RequestError)
      return new Response(e.message, { status: 400 });
    if (e instanceof ValiError) return new Response(e.message, { status: 400 });
    if (e instanceof NotFoundError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });
    if (e instanceof TooManyTransactionRetriesError)
      return new Response(e.message, { status: e.statusCode });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}

type EntraIdUserInfo = {
  sub: string;
  name: string;
  family_name: string;
  given_name: string;
  picture: string;
  email: string;
};
