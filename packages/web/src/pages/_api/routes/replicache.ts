import { BadRequestError } from "@paperwait/core/errors";
import { pull, push } from "@paperwait/core/replicache";
import { PullRequest, PushRequest } from "@paperwait/core/schemas";
import { validator } from "@paperwait/core/valibot";
import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";

import { authorization } from "~/api/middleware";

import type { HonoParameters } from "~/api/types";

export default new Hono<HonoParameters>()
  .use(authorization())
  .post(
    "/pull",
    honoValidator(
      "json",
      validator(PullRequest, {
        Error: BadRequestError,
        message: "Invalid body",
      }),
    ),
    async (c) => {
      const pullResult = await pull(c.env.user!, c.req.valid("json"));

      if (pullResult.type !== "success")
        return c.json(pullResult.response, { status: 400 });

      return c.json(pullResult.response, { status: 200 });
    },
  )
  .post(
    "/push",
    honoValidator(
      "json",
      validator(PushRequest, {
        Error: BadRequestError,
        message: "Invalid body",
      }),
    ),
    async (c) => {
      const pushResult = await push(c.env.user!, c.req.valid("json"));

      if (pushResult.type !== "success")
        return c.json(pushResult.response, { status: 400 });

      return c.json(null, { status: 200 });
    },
  );
