import { withActor } from "@printworks/core/actors";
import { Sessions } from "@printworks/core/sessions";
import { Constants } from "@printworks/core/utils/constants";
import { defineMiddleware } from "astro:middleware";

import { isPrerenderedPage } from "~/middleware/utils";

export const auth = defineMiddleware(async (context, next) => {
  if (isPrerenderedPage(context.url.pathname)) return next();

  const token =
    context.cookies.get(Constants.SESSION_COOKIE_NAME)?.value ?? null;
  if (!token)
    return withActor(
      {
        type: "user",
        properties: {
          isAuthed: false,
          session: null,
          user: null,
          tenant: null,
        },
      },
      next,
    );

  const auth = await Sessions.validateToken(token);

  const cookie = Sessions.createCookie(
    auth.session ? { token, expiresAt: auth.session.expiresAt } : undefined,
  );

  context.cookies.set(cookie.name, cookie.value, cookie.attributes);

  return withActor({ type: "user", properties: auth }, next);
});
