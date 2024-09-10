import * as Auth from "@paperwait/core/auth";
import { withAuth } from "@paperwait/core/auth/context";
import { AUTH_SESSION_COOKIE_NAME } from "@paperwait/core/constants";
import { defineMiddleware } from "astro:middleware";

import { isPrerenderedPage } from "~/middleware/utils";

export const auth = defineMiddleware(async (context, next) => {
  if (isPrerenderedPage(context.url.pathname)) return await next();

  const sessionId =
    context.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null;

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

  if (session.fresh) {
    const cookie = Auth.createSessionCookie(session.id);

    context.cookies.set(cookie.name, cookie.value, cookie.attributes);
  }

  return await withAuth(
    { isAuthed: true, session, user: user.data, org: user.org },
    next,
  );
});
