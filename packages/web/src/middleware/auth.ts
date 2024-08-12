import { lucia } from "@paperwait/core/auth";
import { db } from "@paperwait/core/database";
import { Organization } from "@paperwait/core/organization";
import { defineMiddleware } from "astro:middleware";
import { eq } from "drizzle-orm";

import { isPrerenderedPage } from "~/middleware/utils";

export const auth = defineMiddleware(async (context, next) => {
  if (isPrerenderedPage(context.url.pathname)) return await next();

  const sessionId = context.cookies.get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    context.locals.user = null;
    context.locals.session = null;
    context.locals.org = null;

    return await next();
  }

  const { session, user } = await lucia.validateSession(sessionId);

  const org = user
    ? await db
        .select({
          id: Organization.id,
          slug: Organization.slug,
        })
        .from(Organization)
        .where(eq(Organization.id, user.orgId))
        .then((rows) => rows.at(0) ?? null)
    : null;

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

  return await next();
});
