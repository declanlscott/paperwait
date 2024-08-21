import { vValidator } from "@hono/valibot-validator";
import { useAuthenticated } from "@paperwait/core/auth";
import { db } from "@paperwait/core/database";
import {
  HttpError,
  NotFoundError,
  NotImplementedError,
} from "@paperwait/core/errors";
import { useOAuth2 } from "@paperwait/core/oauth2";
import { NanoId } from "@paperwait/core/schemas";
import { User } from "@paperwait/core/user";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";

import { authorization, provider } from "~/api/middleware";

export default new Hono()
  .use(authorization())
  .use(provider)
  .get(
    "/:id/photo",
    vValidator("param", v.object({ id: NanoId })),
    async (c) => {
      const { org } = useAuthenticated();
      const oAuth2 = useOAuth2();

      // TODO: Implement google provider
      if (oAuth2.provider.variant !== "entra-id")
        throw new NotImplementedError(
          `Provider "${oAuth2.provider.variant}" not implemented`,
        );

      const user = await db
        .select({ providerId: User.providerId })
        .from(User)
        .where(
          and(eq(User.id, c.req.valid("param").id), eq(User.orgId, org.id)),
        )
        .then((rows) => rows.at(0));
      if (!user) throw new NotFoundError("User not found");

      const res = await fetch(
        `https://graph.microsoft.com/v1.0/users/${user.providerId}/photo/$value`,
        {
          headers: {
            Authorization: `Bearer ${oAuth2.provider.accessToken}`,
          },
        },
      );
      if (!res.ok) throw new HttpError(res.statusText, res.status);

      const contentType = res.headers.get("Content-Type");

      return c.body(res.body, {
        status: res.status,
        headers: {
          ...(contentType ? { "Content-type": contentType } : undefined),
          "Cache-Control": "max-age=2592000",
        },
      });
    },
  );
