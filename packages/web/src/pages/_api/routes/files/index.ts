import { useAuthenticated } from "@paperwait/core/auth";
import { buildSsmParameterPath, getSsmParameter } from "@paperwait/core/aws";
import { MAX_FILE_SIZES_PARAMETER_NAME } from "@paperwait/core/constants";
import { InternalServerError } from "@paperwait/core/errors";
import { MaxFileSizes } from "@paperwait/core/schemas";
import { validate } from "@paperwait/core/valibot";
import { Hono } from "hono";

import { authorization } from "~/api/middleware";
import assets from "~/api/routes/files/assets";
import documents from "~/api/routes/files/documents";

export default new Hono()
  .use(authorization())
  .get(
    "/max-file-sizes",
    authorization(["administrator", "operator"]),
    async (c) => {
      const { org } = useAuthenticated();

      const maxFileSizes = validate(
        MaxFileSizes,
        await getSsmParameter({
          Name: buildSsmParameterPath(org.id, MAX_FILE_SIZES_PARAMETER_NAME),
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
