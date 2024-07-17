import { BadRequestError } from "@paperwait/core/errors";
import { validator } from "@paperwait/core/valibot";
import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";
import * as v from "valibot";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>()
  .get("/signed-put-urls", async (c) => {
    //: Implement signed PUT URLs
  })
  .get(
    "/signed-get-urls",
    honoValidator(
      "query",
      validator(v.object({ name: v.string() }), {
        Error: BadRequestError,
        message: "Invalid query",
      }),
    ),
    async (c) => {
      // TODO: Implement signed GET URLs
    },
  );
