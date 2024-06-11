import { BadRequestError } from "@paperwait/core/errors";
import {
  pull,
  PullRequest,
  push,
  PushRequest,
} from "@paperwait/core/replicache";
import { validate } from "@paperwait/core/valibot";
import { Hono } from "hono";
import { validator } from "hono/validator";

import { authorize } from "~/api/lib/auth/authorize";

import type { BindingsInput } from "~/api/lib/bindings";

export default new Hono<{ Bindings: BindingsInput }>()
  .post(
    "/pull",
    validator(
      "json",
      validate(PullRequest, {
        Error: BadRequestError,
        message: "Invalid body",
      }),
    ),
    async (c) => {
      const { user } = authorize(c.env);

      const pullResult = await pull(user, c.req.valid("json"));

      if (pullResult.type !== "success")
        return c.json(pullResult.response, { status: 400 });

      return c.json(pullResult.response, { status: 200 });
    },
  )
  .post(
    "/push",
    validator(
      "json",
      validate(PushRequest, {
        Error: BadRequestError,
        message: "Invalid body",
      }),
    ),
    async (c) => {
      const { user } = authorize(c.env);

      const pushResult = await push(user, c.req.valid("json"));

      if (pushResult.type !== "success")
        return c.json(pushResult.response, { status: 400 });

      return c.json(null, { status: 200 });
    },
  );
