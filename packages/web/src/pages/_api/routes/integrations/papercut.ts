import { vValidator } from "@hono/valibot-validator";
import { useAuthenticated } from "@paperwait/core/auth";
import { buildSsmParameterPath, putSsmParameter } from "@paperwait/core/aws";
import { PAPERCUT_PARAMETER_NAME } from "@paperwait/core/constants";
import { serializable } from "@paperwait/core/orm";
import { healthCheck, syncPapercutAccounts } from "@paperwait/core/papercut";
import { formatChannel } from "@paperwait/core/realtime";
import { poke } from "@paperwait/core/replicache";
import { mutatorRbac, PapercutParameter } from "@paperwait/core/schemas";
import { Hono } from "hono";

import { authorization } from "~/api/middleware";

export default new Hono()
  .put(
    "/accounts",
    authorization(mutatorRbac.syncPapercutAccounts),
    async (c) => {
      const { org } = useAuthenticated();

      await serializable(() => syncPapercutAccounts());

      await poke([formatChannel("org", org.id)]);

      return c.body(null, 204);
    },
  )
  .put(
    "/credentials",
    authorization(["administrator"]),
    vValidator("json", PapercutParameter),
    async (c) => {
      const { org } = useAuthenticated();

      await putSsmParameter({
        Name: buildSsmParameterPath(org.id, PAPERCUT_PARAMETER_NAME),
        Value: JSON.stringify(c.req.valid("json")),
        Type: "SecureString",
        Overwrite: true,
      });

      return c.body(null, 204);
    },
  )
  .post("/health-check", authorization(["administrator"]), async (c) => {
    const { org } = useAuthenticated();

    await healthCheck({
      orgId: org.id,
      input: { authorized: true },
    });

    return c.body(null, 204);
  });
