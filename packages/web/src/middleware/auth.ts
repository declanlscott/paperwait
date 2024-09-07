import * as Auth from "@paperwait/core/auth";
import { withAuth } from "@paperwait/core/auth/context";
import { db, eq } from "@paperwait/core/drizzle";
import { organizations } from "@paperwait/core/organizations/sql";
import { defineMiddleware } from "astro:middleware";

import { isPrerenderedPage } from "~/middleware/utils";

export const auth = defineMiddleware(async (context, next) => {
  if (isPrerenderedPage(context.url.pathname)) return await next();

  const sessionId = context.cookies.get(Auth.sessionCookieName)?.value ?? null;

  if (!sessionId)
    return await withAuth(
      { isAuthed: false, session: null, user: null, org: null },
      next,
    );

  const { session, user } = await Auth.validateSession(sessionId);

  if (!session) {
    const cookie = Auth.createSessionCookie();

    context.cookies.set(cookie.name, cookie.value, cookie.attributes);

    return await withAuth(
      { isAuthed: false, session: null, user: null, org: null },
      next,
    );
  }

  const org = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      status: organizations.status,
    })
    .from(organizations)
    .where(eq(organizations.id, user.orgId))
    .then((rows) => rows.at(0));
  if (!org) throw new Error("Organization not found");

  if (session.fresh) {
    const cookie = Auth.createSessionCookie(session.id);

    context.cookies.set(cookie.name, cookie.value, cookie.attributes);
  }

  return await withAuth({ isAuthed: true, session, user, org }, next);
});
