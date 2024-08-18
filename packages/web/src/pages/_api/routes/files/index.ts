import { buildSsmParameterPath, getSsmParameter } from "@paperwait/core/aws";
import { MAX_FILE_SIZES_PARAMETER_NAME } from "@paperwait/core/constants";
import { InternalServerError } from "@paperwait/core/errors";
import { MaxFileSizes } from "@paperwait/core/schemas";
import { validate } from "@paperwait/core/valibot";
import { Hono } from "hono";

import { authorization } from "~/api/middleware";
import assets from "~/api/routes/files/assets";
import documents from "~/api/routes/files/documents";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>()
  .use(authorization())
  .get(
    "/max-file-sizes",
    authorization(["administrator", "operator"]),
    async (c) => {
      const orgId = c.env.locals.org!.id;

      const maxFileSizes = validate(
        MaxFileSizes,
        await getSsmParameter({
          Name: buildSsmParameterPath(orgId, MAX_FILE_SIZES_PARAMETER_NAME),
        }),
        {
          Error: InternalServerError,
          message: "Failed to get max file sizes",
        },
      );

      return c.json(maxFileSizes, 200);
    },
  )
  .route("/assets", assets)
  .route("/documents", documents);
