import { vValidator } from "@hono/valibot-validator";
import { buildSsmParameterPath, putSsmParameter } from "@paperwait/core/aws";
import { PAPERCUT_PARAMETER_NAME } from "@paperwait/core/constants";
import { serializable } from "@paperwait/core/database";
import { syncPapercutAccounts, testPapercut } from "@paperwait/core/papercut";
import { formatChannel } from "@paperwait/core/realtime";
import { poke } from "@paperwait/core/replicache";
import { mutatorRbac, PapercutParameter } from "@paperwait/core/schemas";
import { Hono } from "hono";

import { authorization } from "~/api/middleware";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>()
  .put(
    "/accounts",
    authorization(mutatorRbac.syncPapercutAccounts),
    async (c) => {
      const orgId = c.env.locals.org!.id;

      await serializable(async (tx) => await syncPapercutAccounts(tx, orgId));

      await poke([formatChannel("org", orgId)]);

      return c.body(null, { status: 204 });
    },
  )
  .put(
    "/credentials",
    authorization(["administrator"]),
    vValidator("json", PapercutParameter),
    async (c) => {
      await putSsmParameter({
        Name: buildSsmParameterPath(
          c.env.locals.org!.id,
          PAPERCUT_PARAMETER_NAME,
        ),
        Value: JSON.stringify(c.req.valid("json")),
        Type: "SecureString",
        Overwrite: true,
      });

      return c.body(null, { status: 204 });
    },
  )
  .post("/test", authorization(["administrator"]), async (c) => {
    await testPapercut({
      orgId: c.env.locals.org!.id,
      input: { authorized: true },
    });

    return c.body(null, { status: 204 });
  });
