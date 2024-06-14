import { db } from "@paperwait/core/database";
import {
  BadRequestError,
  NotFoundError,
  NotImplementedError,
} from "@paperwait/core/errors";
import { NanoId } from "@paperwait/core/id";
import { User } from "@paperwait/core/user";
import { validator } from "@paperwait/core/valibot";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";
import ky from "ky";
import * as v from "valibot";

import { authorization, provider } from "~/api/middleware";

import type { StatusCode } from "hono/utils/http-status";

export default new Hono()
  .use(authorization())
  .use(provider)
  .get(
    "/:id/photo",
    honoValidator(
      "param",
      validator(v.object({ id: NanoId }), {
        Error: BadRequestError,
        message: "Invalid parameter",
      }),
    ),
    async (c) => {
      // TODO: Implement google provider
      if (c.get("provider")!.type !== "entra-id")
        throw new NotImplementedError(
          `Provider "${c.get("provider")!.type}" not implemented`,
        );

      const [user] = await db
        .select({ providerId: User.providerId })
        .from(User)
        .where(
          and(
            eq(User.id, c.req.valid("param").id),
            eq(User.orgId, c.get("locals").user!.orgId),
          ),
        );
      if (!user) throw new NotFoundError("User not found");

      const res = await ky.get(
        `https://graph.microsoft.com/v1.0/users/${user.providerId}/photo/$value`,
        {
          headers: {
            Authorization: `Bearer ${c.get("provider")!.accessToken}`,
          },
        },
      );

      c.header("Content-Type", res.headers.get("Content-Type") ?? undefined);
      c.header("Cache-Control", "max-age=2592000");
      c.status(res.status as StatusCode);

      return c.body(res.body);
    },
  );
