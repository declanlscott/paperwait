import { putParameter } from "@paperwait/core/aws";
import { transact } from "@paperwait/core/database";
import { BadRequestError } from "@paperwait/core/errors";
import { syncPapercutAccounts, testPapercut } from "@paperwait/core/papercut";
import { formatChannel } from "@paperwait/core/realtime";
import { poke } from "@paperwait/core/replicache";
import { mutatorRbac, PapercutParameter } from "@paperwait/core/schemas";
import { validator } from "@paperwait/core/valibot";
import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";

import { authorization } from "~/api/middleware";

import type { HonoParameters } from "~/api/types";

export default new Hono<HonoParameters>()
  .put(
    "/accounts",
    authorization(mutatorRbac.syncPapercutAccounts),
    async (c) => {
      const orgId = c.env.org!.id;

      await transact(async (tx) => await syncPapercutAccounts(tx, orgId));

      await poke([formatChannel("org", orgId)]);

      return c.body(null, { status: 204 });
    },
  )
  .put(
    "/credentials",
    authorization(["administrator"]),
    honoValidator(
      "json",
      validator(PapercutParameter, {
        Error: BadRequestError,
        message: "Invalid body",
      }),
    ),
    async (c) => {
      await putParameter({
        Name: `/paperwait/org/${c.env.org!.id}/papercut`,
        Value: JSON.stringify(c.req.valid("json")),
        Type: "SecureString",
        Overwrite: true,
      });

      return c.body(null, { status: 204 });
    },
  )
  .post("/test", authorization(["administrator"]), async (c) => {
    await testPapercut({
      orgId: c.env.org!.id,
      input: { authorized: true },
    });

    return c.body(null, { status: 204 });
  });
