import { createClient } from "@openauthjs/openauth/client";
import { withActor } from "@printworks/core/actors/context";
import { Auth } from "@printworks/core/auth";
import { subjects } from "@printworks/core/auth/shared";
import { defineMiddleware } from "astro:middleware";

export const auth = defineMiddleware(async (ctx, next) => {
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
        const tokensCookieAttributes = Auth.buildTokensCookieAttributes(
          verified.tokens,
        );

        for (const tokenCookieAttributes of tokensCookieAttributes)
          ctx.cookies.set(...tokenCookieAttributes);

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
