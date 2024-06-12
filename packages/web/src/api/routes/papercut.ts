import { putParameter } from "@paperwait/core/aws";
import { transact } from "@paperwait/core/database";
import { BadRequestError } from "@paperwait/core/errors";
import { NanoId } from "@paperwait/core/id";
import {
  globalPermissions,
  SyncPapercutAccountsMutationArgs,
} from "@paperwait/core/mutations";
import {
  PapercutParameter,
  syncPapercutAccounts,
  testPapercut,
} from "@paperwait/core/papercut";
import { formatChannel } from "@paperwait/core/realtime";
import { poke } from "@paperwait/core/replicache";
import { validator } from "@paperwait/core/valibot";
import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";
import * as v from "valibot";

import { authorize } from "~/api/lib/auth/authorize";

import type { BindingsInput } from "~/api/lib/bindings";

export default new Hono<{ Bindings: BindingsInput }>()
  .put(
    "/accounts",
    honoValidator(
      "json",
      validator(SyncPapercutAccountsMutationArgs, {
        Error: BadRequestError,
        message: "Invalid body",
      }),
    ),
    async (c) => {
      const { user } = authorize(c.env, globalPermissions.syncPapercutAccounts);

      await transact(
        async (tx) =>
          await syncPapercutAccounts(tx, user.orgId, c.req.valid("json")),
      );

      await poke([formatChannel("org", user.orgId)]);

      return c.json(null, { status: 204 });
    },
  )
  .put(
    "/credentials",
    honoValidator(
      "json",
      validator(PapercutParameter, {
        Error: BadRequestError,
        message: "Invalid body",
      }),
    ),
    async (c) => {
      const { user } = authorize(c.env, ["administrator"]);

      await putParameter({
        Name: `/paperwait/org/${user.orgId}/papercut`,
        Value: JSON.stringify(c.req.valid("json")),
        Type: "SecureString",
        Overwrite: true,
      });

      return c.json(null, { status: 204 });
    },
  )
  .post(
    "/test",
    honoValidator(
      "form",
      validator(v.object({ orgId: NanoId, authToken: v.string() }), {
        Error: BadRequestError,
        message: "Invalid form data",
      }),
    ),
    async (c) => {
      const { orgId, authToken } = c.req.valid("form");

      await testPapercut({ orgId, input: { authToken } });

      return c.json(null, { status: 204 });
    },
  );
