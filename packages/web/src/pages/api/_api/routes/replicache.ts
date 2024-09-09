import * as Replicache from "@paperwait/core/replicache";
import { Hono } from "hono";

import { authorization } from "~/api/middleware";

export default new Hono()
  .use(authorization())
  .post("/pull", async (c) => {
    const pullResult = await Replicache.pull(await c.req.json());

    if (pullResult.variant !== "success")
      return c.json(pullResult.response, { status: 400 });

    return c.json(pullResult.response, { status: 200 });
  })
  .post("/push", async (c) => {
    const pushResult = await Replicache.push(await c.req.json());

    if (pushResult.variant !== "success")
      return c.json(pushResult.response, { status: 400 });

    return c.json(null, { status: 200 });
  });
