import { vValidator } from "@hono/valibot-validator";
import { db } from "@paperwait/core/database";
import {
  HttpError,
  NotFoundError,
  NotImplementedError,
} from "@paperwait/core/errors";
import { NanoId } from "@paperwait/core/schemas";
import { User } from "@paperwait/core/user";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";

import { authorization, provider } from "~/api/middleware";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>()
  .use(authorization())
  .use(provider)
  .get(
    "/:id/photo",
    vValidator("param", v.object({ id: NanoId })),
    async (c) => {
      // TODO: Implement google provider
      if (c.get("oAuth2Provider")!.variant !== "entra-id")
        throw new NotImplementedError(
          `Provider "${c.get("oAuth2Provider")!.variant}" not implemented`,
        );

      const user = await db
        .select({ providerId: User.providerId })
        .from(User)
        .where(
          and(
            eq(User.id, c.req.valid("param").id),
            eq(User.orgId, c.env.locals.org!.id),
          ),
        )
        .then((rows) => rows.at(0));
      if (!user) throw new NotFoundError("User not found");

      const res = await fetch(
        `https://graph.microsoft.com/v1.0/users/${user.providerId}/photo/$value`,
        {
          headers: {
            Authorization: `Bearer ${c.get("oAuth2Provider")!.accessToken}`,
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
