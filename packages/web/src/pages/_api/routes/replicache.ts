import { vValidator } from "@hono/valibot-validator";
import { pull, push } from "@paperwait/core/replicache";
import { PullRequest, PushRequest } from "@paperwait/core/schemas";
import { Hono } from "hono";

import { authorization } from "~/api/middleware";

export default new Hono()
  .use(authorization())
  .post("/pull", vValidator("json", PullRequest), async (c) => {
    const pullResult = await pull(c.req.valid("json"));

    if (pullResult.type !== "success")
      return c.json(pullResult.response, { status: 400 });

    return c.json(pullResult.response, { status: 200 });
  })
  .post("/push", vValidator("json", PushRequest), async (c) => {
    const pushResult = await push(c.req.valid("json"));

    if (pushResult.type !== "success")
      return c.json(pushResult.response, { status: 400 });

    return c.json(null, { status: 200 });
  });
