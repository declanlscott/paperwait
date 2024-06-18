import { lucia } from "@paperwait/core/auth";
import { db } from "@paperwait/core/database";
import { Organization } from "@paperwait/core/organization";
import { defineMiddleware } from "astro:middleware";
import { eq } from "drizzle-orm";

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith("/partials")) return next();

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
        .select({
          id: Organization.id,
          slug: Organization.slug,
        })
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
