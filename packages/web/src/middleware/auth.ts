import { createClient } from "@openauthjs/openauth/client";
import { withActor } from "@printworks/core/actors/context";
import { subjects } from "@printworks/core/auth/shared";
import { createTransaction } from "@printworks/core/drizzle/context";
import { Tenants } from "@printworks/core/tenants";
import { Users } from "@printworks/core/users";
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

        const [user, tenant] = await withActor(
          {
            type: "system",
            properties: { tenantId: verified.subject.properties.tenantId },
          },
          () =>
            createTransaction(async () =>
              Promise.all([
                Users.read([verified.subject.properties.id]).then((rows) =>
                  rows.at(0),
                ),
                Tenants.read().then((rows) => rows.at(0)),
              ]),
            ),
        );

        if (user && tenant)
          return withActor(
            { type: "user", properties: { isAuthed: true, user, tenant } },
            next,
          );

        if (!user) console.log("Missing user", verified.subject.properties.id);
        if (!tenant)
          console.log("Missing tenant", verified.subject.properties.tenantId);
      }
    }
  }

  return withActor(
    { type: "user", properties: { isAuthed: false, user: null, tenant: null } },
    next,
  );
});
