import { lucia, withAuth } from "@paperwait/core/auth";
import { db } from "@paperwait/core/database";
import { Organization } from "@paperwait/core/organization";
import { defineMiddleware } from "astro:middleware";
import { eq } from "drizzle-orm";

import { isPrerenderedPage } from "~/middleware/utils";

export const auth = defineMiddleware(async (context, next) => {
  if (isPrerenderedPage(context.url.pathname)) return await next();

  const sessionId = context.cookies.get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId)
    return await withAuth(
      { isAuthed: false, session: null, user: null, org: null },
      next,
    );

  const { session, user } = await lucia.validateSession(sessionId);

  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie();

    context.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );

    return await withAuth(
      { isAuthed: false, session: null, user: null, org: null },
      next,
    );
  }

  const org = await db
    .select({
      id: Organization.id,
      slug: Organization.slug,
    })
    .from(Organization)
    .where(eq(Organization.id, user.orgId))
    .then((rows) => rows.at(0));
  if (!org) throw new Error("Organization not found");

  if (session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);

    context.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );
  }

  return await withAuth({ isAuthed: true, session, user, org }, next);
});
