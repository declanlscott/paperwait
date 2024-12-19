import { vValidator } from "@hono/valibot-validator";
import { Papercut } from "@printworks/core/papercut";
import { Hono } from "hono";
import * as v from "valibot";

import { ssmClient } from "~/api/middleware/aws";

export default new Hono()
  .put(
    "/server/tailnet-uri",
    vValidator("json", v.object({ tailnetUri: v.pipe(v.string(), v.url()) })),
    ssmClient("SetTailnetPapercutServerUri"),
    async (c) => {
      await Papercut.setTailnetServerUri(c.req.valid("json").tailnetUri);

      return c.body(null, 204);
    },
  )
  .put(
    "/server/auth-token",
    vValidator("json", v.object({ authToken: v.string() })),
    ssmClient("SetPapercutServerAuthToken"),
    async (c) => {
      await Papercut.setServerAuthToken(c.req.valid("json").authToken);

      return c.body(null, 204);
    },
  );
