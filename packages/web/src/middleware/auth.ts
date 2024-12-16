import { createClient } from "@openauthjs/openauth/client";
import { withActor } from "@printworks/core/actors/context";
import { subjects } from "@printworks/core/auth/shared";
import { defineMiddleware } from "astro:middleware";

import { isPrerenderedPage } from "~/middleware/utils";

export const auth = defineMiddleware(async (ctx, next) => {
  if (isPrerenderedPage(ctx.request.url)) return next();

  const accessToken = ctx.cookies.get("access_token");
  if (accessToken) {
    const refreshToken = ctx.cookies.get("refresh_token");

    // NOTE: `clientID` can be anything here because openauth
    // doesn't need it for verification
    const verified = await createClient({ clientID: "web" }).verify(
      subjects,
      accessToken.value,
      { refresh: refreshToken?.value },
    );

    if (!verified.err) {
      if (verified.tokens) {
        for (const key in verified.tokens)
          ctx.cookies.set(
            `${key}_token`,
            verified.tokens[key as keyof typeof verified.tokens],
            {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              maxAge: 31449600, // 1 year
            },
          );

        return withActor(
          {
            type: "user",
            properties: {
              id: verified.subject.properties.id,
              tenantId: verified.subject.properties.tenantId,
            },
          },
          next,
        );
      }
    }
  }

  return withActor({ type: "public", properties: {} }, next);
});
