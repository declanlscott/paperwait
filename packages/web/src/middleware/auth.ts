import { Sessions } from "@paperwait/core/sessions";
import { withAuth } from "@paperwait/core/sessions/context";
import { Constants } from "@paperwait/core/utils/constants";
import { defineMiddleware } from "astro:middleware";

import { isPrerenderedPage } from "~/middleware/utils";

export const auth = defineMiddleware(async (context, next) => {
  if (isPrerenderedPage(context.url.pathname)) return next();

  const token =
    context.cookies.get(Constants.SESSION_COOKIE_NAME)?.value ?? null;
  if (!token)
    return withAuth(
      { isAuthed: false, session: null, user: null, tenant: null },
      next,
    );

  const auth = await Sessions.validateToken(token);

  const cookie = Sessions.createCookie(
    auth.session ? { token, expiresAt: auth.session.expiresAt } : undefined,
  );

  context.cookies.set(cookie.name, cookie.value, cookie.attributes);

  return withAuth(auth, next);
});
