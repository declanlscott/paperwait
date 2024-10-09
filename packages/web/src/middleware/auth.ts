import * as Auth from "@paperwait/core/auth";
import { withAuth } from "@paperwait/core/auth/context";
import { SESSION_COOKIE_NAME } from "@paperwait/core/constants";
import { defineMiddleware } from "astro:middleware";

import { isPrerenderedPage } from "~/middleware/utils";

export const auth = defineMiddleware(async (context, next) => {
  if (isPrerenderedPage(context.url.pathname)) return await next();

  const token = context.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  if (!token)
    return await withAuth(
      { isAuthed: false, session: null, user: null, tenant: null },
      next,
    );

  const { session, user, tenant } = await Auth.validateSessionToken(token);
  if (!session) {
    const cookie = Auth.createSessionCookie();

    context.cookies.set(cookie.name, cookie.value, cookie.attributes);

    return await withAuth(
      { isAuthed: false, session: null, user: null, tenant: null },
      next,
    );
  }

  const cookie = Auth.createSessionCookie({
    token,
    expiresAt: session.expiresAt,
  });
  context.cookies.set(cookie.name, cookie.value, cookie.attributes);

  return await withAuth({ isAuthed: true, session, user, tenant }, next);
});
