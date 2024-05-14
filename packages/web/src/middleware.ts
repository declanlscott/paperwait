import { lucia } from "@paperwait/core/auth";
import { db } from "@paperwait/core/database";
import { Organization } from "@paperwait/core/organization";
import { defineMiddleware } from "astro:middleware";
import { eq } from "drizzle-orm";
import { verifyRequestOrigin } from "oslo/request";

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith("/partials")) {
    return next();
  }

  if (context.request.method !== "GET") {
    const originHeader = context.request.headers.get("Origin");
    const hostHeader = context.request.headers.get("Host");

    if (
      !originHeader ||
      !hostHeader ||
      !verifyRequestOrigin(originHeader, [hostHeader])
    ) {
      return new Response(null, { status: 403 });
    }
  }

  const sessionId = context.cookies.get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    context.locals.user = null;
    context.locals.session = null;
    context.locals.org = null;

    return next();
  }

  const { session, user } = await lucia.validateSession(sessionId);

  const [org] = user
    ? await db
        .select({ slug: Organization.slug, name: Organization.name })
        .from(Organization)
        .where(eq(Organization.id, user.orgId))
    : [null];

  if (session?.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);

    context.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );
  }

  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie();

    context.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );
  }

  context.locals.session = session;
  context.locals.user = user;
  context.locals.org = org;

  return next();
});
